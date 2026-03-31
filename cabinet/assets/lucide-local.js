(function (window) {
  const icons = {
    scanSearch: [
      '<circle cx="11" cy="11" r="8"></circle>',
      '<path d="m21 21-4.3-4.3"></path>',
      '<path d="m8.6 11 1.7 1.7 3.9-3.9"></path>',
    ],
    gauge: [
      '<path d="m12 14 4-4"></path>',
      '<path d="M3.34 19a10 10 0 1 1 17.32 0"></path>',
    ],
    fileText: [
      '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path>',
      '<path d="M14 2v4a2 2 0 0 0 2 2h4"></path>',
      '<path d="M8 13h8"></path>',
      '<path d="M8 17h5"></path>',
      '<path d="M10 9H8"></path>',
    ],
    image: [
      '<rect x="3" y="5" width="18" height="14" rx="2"></rect>',
      '<circle cx="8.5" cy="9.5" r="1.5"></circle>',
      '<path d="m21 15-5-5L5 21"></path>',
    ],
    sparkles: [
      '<path d="M9.9 2.3 11.6 7l4.7 1.7-4.7 1.7-1.7 4.7-1.7-4.7-4.7-1.7L8.2 7l1.7-4.7Z"></path>',
      '<path d="M18 14l1 2.7 2.7 1-2.7 1-1 2.7-1-2.7-2.7-1 2.7-1 1-2.7Z"></path>',
    ],
    mapPinned: [
      '<path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z"></path>',
      '<circle cx="12" cy="11" r="2.5"></circle>',
    ],
    arrowRight: [
      '<path d="M5 12h14"></path>',
      '<path d="m13 5 7 7-7 7"></path>',
    ],
    triangleAlert: [
      '<path d="m10.29 3.86-7.86 13.5A2 2 0 0 0 4.15 20h15.7a2 2 0 0 0 1.72-3.01l-7.86-13.5a2 2 0 0 0-3.42 0Z"></path>',
      '<path d="M12 9v4"></path>',
      '<path d="M12 17h.01"></path>',
    ],
    checkCircle2: [
      '<circle cx="12" cy="12" r="10"></circle>',
      '<path d="m9 12 2 2 4-4"></path>',
    ],
    galleryHorizontal: [
      '<path d="M3 7h18"></path>',
      '<path d="M3 17h18"></path>',
      '<rect x="4" y="8" width="16" height="8" rx="2"></rect>',
      '<path d="m8 13 2-2 2 2 2-2 3 3"></path>',
    ],
    barChart3: [
      '<path d="M3 3v18h18"></path>',
      '<path d="M8 16v-3"></path>',
      '<path d="M13 16V8"></path>',
      '<path d="M18 16V5"></path>',
    ],
    camera: [
      '<path d="M14.5 4H20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.5"></path>',
      '<path d="M8 4 9.5 2h5L16 4"></path>',
      '<circle cx="12" cy="12" r="4"></circle>',
    ],
    link2: [
      '<path d="M9 17H7A5 5 0 0 1 7 7h2"></path>',
      '<path d="M15 7h2a5 5 0 0 1 0 10h-2"></path>',
      '<path d="M8 12h8"></path>',
    ],
    target: [
      '<circle cx="12" cy="12" r="10"></circle>',
      '<circle cx="12" cy="12" r="6"></circle>',
      '<circle cx="12" cy="12" r="2"></circle>',
    ],
  };

  window.CabinetLucide = {
    render(name, className = 'lucide', size = 18) {
      const body = icons[name] || icons.target;
      const cls = className ? ' ' + className : '';
      return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide' + cls + '">' + body.join('') + '</svg>';
    },
  };
})(window);