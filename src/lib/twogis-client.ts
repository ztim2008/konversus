import "server-only";

const TWOGIS_API_BASE = "https://catalog.api.2gis.com/3.0";

export interface TwogisContact {
  type: "phone" | "email" | "website" | "vkontakte" | "telegram" | "whatsapp" | "odnoklassniki" | "youtube" | "twitter" | "max";
  value: string;
  text?: string;
}

export interface TwogisItem {
  id: string;
  name: string;
  address_name: string;
  address_comment?: string;
  contact_groups?: Array<{
    contacts: TwogisContact[];
  }>;
  point?: { lat: number; lon: number };
  schedule?: object;
  type: string;
  purpose_name?: string;
}

export interface TwogisResponse {
  meta: { api_version: string; code: number; issue_date: string };
  result: { items: TwogisItem[]; total: number };
}

export interface ExtractedLead {
  source: "2gis";
  domain: string;
  name: string;
  url: string;
  phone?: string;
  email?: string;
  website?: string;
  telegram?: string;
  whatsapp?: string;
  vk?: string;
  address: string;
}

export const TWOGIS_CITY_IDS: Record<string, string> = {
  "Москва": "4504222397630173",
  "Санкт-Петербург": "4504222397630175",
  "Казань": "4504222397630181",
  "Екатеринбург": "4504222397630177",
  "Новосибирск": "4504222397630179",
  "Краснодар": "4504222397630185",
  "Ростов-на-Дону": "4504222397630183",
  "Нижний Новгород": "4504222397630187",
  "Челябинск": "4504222397630189",
  "Самара": "4504222397630191",
  "Омск": "4504222397630193",
  "Уфа": "4504222397630195",
  "Красноярск": "4504222397630197",
  "Воронеж": "4504222397630199",
  "Пермь": "4504222397630201",
  "Волгоград": "4504222397630203",
};

export async function searchTwogis(
  query: string,
  cityId: string,
  page: number = 1
): Promise<{ items: TwogisItem[]; total: number }> {
  const apiKey = process.env.TWOGIS_API_KEY || "demo";
  const url = new URL(`${TWOGIS_API_BASE}/items`);
  url.searchParams.set("q", query);
  url.searchParams.set("city_id", cityId);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("fields", "items.contact_groups,items.point,items.schedule");
  url.searchParams.set("limit", "50");
  url.searchParams.set("page", String(page));

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "KonversusLeadRadar/1.0" },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`2GIS API error: ${res.status} ${res.statusText}`);

  const data: TwogisResponse = await res.json();
  if (data.meta.code !== 200) throw new Error(`2GIS API error: ${JSON.stringify(data.meta)}`);

  return { items: data.result.items || [], total: data.result.total || 0 };
}

export function extractContactsFromItem(item: TwogisItem) {
  const result: Record<string, string | undefined> = {};
  if (!item.contact_groups) return result;

  for (const group of item.contact_groups) {
    for (const contact of group.contacts) {
      switch (contact.type) {
        case "phone":
          if (!result.phone) result.phone = contact.value;
          break;
        case "email":
          if (!result.email) result.email = contact.value;
          break;
        case "website":
          const url = contact.value || contact.text || "";
          if (url && !url.includes("t.me/") && !url.includes("vk.com/") && !url.includes("wa.me/")) {
            if (!result.website) result.website = url;
          }
          if (url.includes("t.me/") || contact.text?.includes("Telegram")) {
            if (!result.telegram) result.telegram = url;
          }
          break;
        case "telegram":
          if (!result.telegram) result.telegram = contact.value;
          break;
        case "whatsapp":
          if (!result.whatsapp) result.whatsapp = contact.value;
          break;
        case "vkontakte":
          if (!result.vk) result.vk = contact.value;
          break;
      }
    }
  }
  return result;
}

function extractDomainFromUrl(urlStr: string): string | null {
  try {
    let cleanUrl = urlStr;
    if (urlStr.includes("link.2gis.com")) {
      const match = urlStr.match(/https?:\/\/[^\s]+\?(https?:\/\/[^\s]+)/);
      if (match) cleanUrl = match[1];
    }
    const url = new URL(cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function extractLeadsFromItems(items: TwogisItem[]): ExtractedLead[] {
  const leads: ExtractedLead[] = [];

  for (const item of items) {
    const contacts = extractContactsFromItem(item);
    let domain: string | null = null;
    let websiteUrl = contacts.website || "";

    if (websiteUrl) {
      domain = extractDomainFromUrl(websiteUrl);
    }

    if (!domain) continue;

    leads.push({
      source: "2gis",
      domain,
      name: item.name,
      url: websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`,
      phone: contacts.phone,
      email: contacts.email,
      website: websiteUrl,
      telegram: contacts.telegram,
      whatsapp: contacts.whatsapp,
      vk: contacts.vk,
      address: item.address_name + (item.address_comment ? `, ${item.address_comment}` : ""),
    });
  }

  return leads;
}
