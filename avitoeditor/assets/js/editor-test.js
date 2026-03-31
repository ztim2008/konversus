// Avito Canvas Editor - Standalone Version - with sharing functionality
// Adapted from WordPress plugin avito-canvas-editor

(function(){
	function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

	ready(function(){
		const root = document.querySelector('.supa-editor');
		if(!root) return;

		if (typeof fabric === 'undefined') {
			console.error('fabric.js not loaded');
			return;
		}

		// Проверяем загрузку Google Fonts
		console.log('🔤 Checking Google Fonts...');
		document.fonts.ready.then(() => {
			console.log('✅ Google Fonts loaded successfully');
		const availableFonts = [...document.fonts].map(f => f.family);
		console.log('📝 Available fonts:', availableFonts.slice(0, 10));
	});

	// === Canvas initialization (TEST VERSION - 1280x960 for Avito) ===
	const canvas = new fabric.Canvas('se-image-editor', {
		backgroundColor: '#11111b',
		preserveObjectStacking: true,
		width: 1280,
		height: 960
	});
	
	// TEST VERSION: Draw canvas border OVER all objects
	function drawCanvasBorder() {
		// Используем верхний контекст чтобы граница была поверх всех объектов
		const ctx = canvas.getSelectionContext();
		ctx.save();
		ctx.strokeStyle = '#f38ba8'; // Розовая граница
		ctx.lineWidth = 4 / canvas.getZoom(); // Компенсируем зум
		ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
		ctx.restore();
	}
	
	// Перерисовываем границу после каждого рендера
	canvas.on('after:render', drawCanvasBorder);
	
	// Export canvas to global scope for template-save.js
	window.canvas = canvas;	// Fix для Fabric.js: устанавливаем правильный textBaseline
	fabric.Object.prototype.textBaseline = 'top';
	
	// Fix для градиентов: правильная сериализация
	fabric.Object.prototype.toObject = (function(toObject) {
		return function(propertiesToInclude) {
			return fabric.util.object.extend(toObject.call(this, propertiesToInclude), {
				// Сохраняем градиент если есть
				fill: this.fill && typeof this.fill === 'object' && this.fill.type ? {
					type: this.fill.type,
					coords: this.fill.coords,
					colorStops: this.fill.colorStops,
					offsetX: this.fill.offsetX,
					offsetY: this.fill.offsetY
				} : this.fill
			});
		};
	})(fabric.Object.prototype.toObject);
	
	// Функция восстановления градиентов после loadFromJSON
	function restoreGradients() {
		canvas.getObjects().forEach(obj => {
			// Фикс для textBaseline - удаляем неправильные значения
			if(obj.textBaseline === 'alphabetical') {
				obj.textBaseline = 'alphabetic';
			}
			
			// Восстанавливаем градиенты
			if(obj.fill && typeof obj.fill === 'object' && obj.fill.type) {
				try {
					const gradient = new fabric.Gradient(obj.fill);
					obj.set('fill', gradient);
				} catch(e) {
					console.warn('Failed to restore gradient:', e);
				}
			}
			
			// Восстанавливаем обработчик масштабирования для подложек
			if(obj._advancedShape && obj.type === 'rect') {
				// Убираем старый обработчик если есть
				obj.off('scaling');
				
				// Добавляем обработчик для пропорционального скругления углов
				obj.on('scaling', function() {
					const newWidth = this.width * this.scaleX;
					const newHeight = this.height * this.scaleY;
					
					if (this._advancedShape && this._initialWidth && this.rx > 0) {
						const scaleRatio = Math.min(newWidth / this._initialWidth, newHeight / this._initialHeight);
						const baseRadius = this._radiusTL || 0;
						this.rx = Math.round(baseRadius * scaleRatio);
						this.ry = this.rx;
					}
					
					this.set({
						width: newWidth,
						height: newHeight,
						scaleX: 1,
						scaleY: 1
					});
					
					this._initialWidth = newWidth;
					this._initialHeight = newHeight;
				});
			}
		});
	}	// === State variables ===
	let zoomLevel = 1;
	let currentObject = null;
	let backgroundImage = null;
	let isProjectLoading = false;
	let snappingEnabled = true;
	let gridEnabled = false;
	let rulersEnabled = false;
	const history = []; 
	const redoStack = []; 
	let isApplyingHistory = false; 
	const MAX_HISTORY = 50;
	const AUTOSAVE_KEY = 'avito_editor_autosave';
	const AUTOSAVE_INTERVAL = 30000; // 30 seconds		// === History management ===
		function makeSnapshot(){
			return {
				canvas: { 
					width: canvas.getWidth(), 
					height: canvas.getHeight(), 
					backgroundColor: canvas.backgroundColor || '#11111b' 
				},
				backgroundImage: backgroundImage ? {
					src: backgroundImage.getSrc ? backgroundImage.getSrc() : (backgroundImage._originalElement?.src || ''),
					width: backgroundImage.width,
					height: backgroundImage.height
				} : null,
				objects: canvas.toJSON(['name','selectable','evented','lockMovementX','lockMovementY','isIcon'])
			};
		}

		function applySnapshot(snap, doneCb){
			if(!snap) return; 
			isApplyingHistory = true; 
			canvas.clear();
			canvas.setWidth(snap.canvas.width); 
			canvas.setHeight(snap.canvas.height); 
			canvas.backgroundColor = snap.canvas.backgroundColor || '#11111b';
			canvas.calcOffset(); // Синхронизация координат
			
			const afterObjects = ()=>{ 
				isApplyingHistory = false; 
				fitToView(); 
				renderLayers(); 
				if(typeof doneCb==='function') doneCb(); 
			};
			
			if(snap.backgroundImage && snap.backgroundImage.src){
				fabric.Image.fromURL(snap.backgroundImage.src, function(img){
					img.set({ 
						width: snap.backgroundImage.width, 
						height: snap.backgroundImage.height, 
						selectable: false, 
						evented: false, 
						name: 'Фоновое изображение' 
					});
					backgroundImage = img; 
					canvas.setBackgroundImage(backgroundImage, function(){ 
						canvas.loadFromJSON(snap.objects, function(){ 
							canvas.renderAll(); 
							afterObjects(); 
						}); 
					});
				}, {crossOrigin:'Anonymous'});
			} else { 
				backgroundImage = null; 
				canvas.loadFromJSON(snap.objects, function(){ 
					canvas.renderAll(); 
					afterObjects(); 
				}); 
			}
		}

		function pushHistory(){ 
			if(isProjectLoading || isApplyingHistory) return; 
			const snap = makeSnapshot(); 
			history.push(snap); 
			if(history.length > MAX_HISTORY) history.shift(); 
			redoStack.length = 0; 
		}

		// === Properties panel ===
		let panelWired = false; 
		let panelUpdating = false;
		
		// Helper: RGB to HEX converter
function rgbToHex(color) {
if (!color) return '#000000';
if (color.startsWith('#')) return color;
const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
if (!match) return color;
const r = parseInt(match[1]); const g = parseInt(match[2]); const b = parseInt(match[3]);
return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function updatePropertiesPanel(obj){
		panelUpdating = true;
		try {
			const opacityInput = id('se-opacity');
			const opacityValue = id('se-opacity-value');
			const fillInput = id('se-fill-color');
			const strokeInput = id('se-stroke-color');
			const strokeWidthInput = id('se-stroke-width');
			const strokeWidthValue = id('se-stroke-width-value');
			const textPanel = id('se-text-properties');
			const fontSizeInput = id('se-font-size');
			const fontSizeValue = id('se-font-size-value');
			const fontFamilySelect = id('se-font-family');
			const lineHeightInput = id('se-line-height');
			const lineHeightValue = id('se-line-height-value');
			const textAlignSelect = id('se-text-align');
			const fontWeightToggle = id('se-font-weight');
			const fontStyleToggle = id('se-font-style');

			const hasObj = !!(obj && obj !== backgroundImage);
			const isText = hasObj && (obj instanceof fabric.IText);
			const isAdvancedShape = hasObj && obj._advancedShape;
			
			// Common controls - показываем только если есть объект
			if(opacityInput) {
				opacityInput.disabled = !hasObj;
				opacityInput.value = hasObj && typeof obj.opacity === 'number' ? Math.round(obj.opacity*100) : 100;
				if(opacityValue) opacityValue.textContent = (opacityInput.value|0) + '%';
			}
			
			// Fill and stroke - скрываем для подложки (у нее свои настройки)
			const showCommonFill = hasObj && !isAdvancedShape;
			if(fillInput){ 
				fillInput.disabled = !showCommonFill;
				fillInput.parentElement.parentElement.style.display = showCommonFill ? '' : 'none';
				// Проверяем, что fill это строка (цвет), а не объект (градиент)
				if(showCommonFill && obj.fill && typeof obj.fill === 'string') {
					fillInput.value = obj.fill.startsWith('rgb') ? rgbToHex(obj.fill) : obj.fill;
				} else if(showCommonFill) {
					fillInput.value = '#ffffff';
				}
			}
			if(strokeInput){ 
				strokeInput.disabled = !showCommonFill;
				if(strokeInput.parentElement.parentElement) {
					strokeInput.parentElement.parentElement.style.display = showCommonFill ? '' : 'none';
				}
				// Проверяем, что stroke это строка
				if(showCommonFill && obj.stroke && typeof obj.stroke === 'string') {
					strokeInput.value = obj.stroke.startsWith('rgb') ? rgbToHex(obj.stroke) : obj.stroke;
				} else if(showCommonFill) {
					strokeInput.value = '#000000';
				}
			}
			if(strokeWidthInput){ 
				strokeWidthInput.disabled = !showCommonFill;
				if(strokeWidthInput.parentElement.parentElement) {
					strokeWidthInput.parentElement.parentElement.style.display = showCommonFill ? '' : 'none';
				}
				strokeWidthInput.value = hasObj && typeof obj.strokeWidth==='number' ? obj.strokeWidth : 1; 
				if(strokeWidthValue) strokeWidthValue.textContent = String(strokeWidthInput.value); 
			}

			// Text specific - показываем только для текста
			if(textPanel) textPanel.style.display = isText ? 'block' : 'none';
			if(isText){
				if(fontSizeInput){ 
					fontSizeInput.value = obj.fontSize || 40; 
					if(fontSizeValue) fontSizeValue.textContent = String(fontSizeInput.value); 
				}
				if(fontFamilySelect){ 
					fontFamilySelect.value = obj.fontFamily || 'Arial'; 
				}
				if(lineHeightInput){ 
					lineHeightInput.value = (obj.lineHeight || 1.0); 
					if(lineHeightValue) lineHeightValue.textContent = (Number(lineHeightInput.value)).toFixed(1); 
				}
				if(textAlignSelect){ 
					textAlignSelect.value = obj.textAlign || 'left'; 
				}
				if(fontWeightToggle){ 
					fontWeightToggle.checked = (obj.fontWeight === 'bold' || obj.fontWeight === 700); 
				}
				if(fontStyleToggle){ 
					fontStyleToggle.checked = (obj.fontStyle === 'italic'); 
				}
				
				// Тень текста
				const textShadowEnabled = id('se-text-shadow-enabled');
				const textShadowControls = id('se-text-shadow-controls');
				if(textShadowEnabled && textShadowControls) {
					const hasShadow = obj.shadow && obj.shadow.color;
					textShadowEnabled.checked = hasShadow;
					textShadowControls.style.display = hasShadow ? 'block' : 'none';
					
					if(hasShadow) {
						const shadowColor = id('se-text-shadow-color');
						const shadowOffsetX = id('se-text-shadow-offset-x');
						const shadowOffsetY = id('se-text-shadow-offset-y');
						const shadowBlur = id('se-text-shadow-blur');
						
						if(shadowColor) shadowColor.value = obj.shadow.color || '#000000';
						if(shadowOffsetX) {
							shadowOffsetX.value = obj.shadow.offsetX || 0;
							const val = id('se-text-shadow-offset-x-value');
							if(val) val.textContent = shadowOffsetX.value;
						}
						if(shadowOffsetY) {
							shadowOffsetY.value = obj.shadow.offsetY || 0;
							const val = id('se-text-shadow-offset-y-value');
							if(val) val.textContent = shadowOffsetY.value;
						}
						if(shadowBlur) {
							shadowBlur.value = obj.shadow.blur || 0;
							const val = id('se-text-shadow-blur-value');
							if(val) val.textContent = shadowBlur.value;
						}
					}
				}
			}
			
			// Градиент текста - показываем только для текста
			const textGradientToggle = id('se-text-gradient-toggle');
			const textGradientControls = id('se-text-gradient-controls');
			if(textGradientToggle && textGradientControls) {
				const hasGradient = isText && obj.fill && typeof obj.fill === 'object' && obj.fill.type;
				textGradientToggle.checked = hasGradient;
				textGradientControls.style.display = hasGradient ? 'block' : 'none';
			}
			
			// Панель подложки обновляется через updateAdvancedShapePanel
		} finally {
			panelUpdating = false;
		}
	}		function setupPropertyControls(){ 
			if(panelWired) return; 
			panelWired = true;
			
			const getObj = ()=>{ 
				const o = canvas.getActiveObject(); 
				return (o && o !== backgroundImage) ? o : null; 
			};
			
			const opacityInput = id('se-opacity'); 
			const opacityValue = id('se-opacity-value');
			opacityInput?.addEventListener('input', ()=>{ 
				if(panelUpdating) return; 
				const o = getObj(); 
				if(!o) return; 
				o.set('opacity', (parseInt(opacityInput.value,10)||0)/100); 
				if(opacityValue) opacityValue.textContent = opacityInput.value+'%'; 
				canvas.renderAll(); 
			});
			opacityInput?.addEventListener('change', ()=>{ 
				if(panelUpdating) return; 
				pushHistory(); 
			});
			
			const fillInput = id('se-fill-color'); 
			fillInput?.addEventListener('input', ()=>{ 
				if(panelUpdating) return; 
				const o = getObj(); 
				if(!o) return; 
				o.set('fill', fillInput.value); 
				canvas.renderAll(); 
			}); 
			fillInput?.addEventListener('change', ()=> pushHistory());
			
			const strokeInput = id('se-stroke-color'); 
			strokeInput?.addEventListener('input', ()=>{ 
				if(panelUpdating) return; 
				const o = getObj(); 
				if(!o) return; 
				o.set('stroke', strokeInput.value); 
				canvas.renderAll(); 
			}); 
			strokeInput?.addEventListener('change', ()=> pushHistory());
			
			const strokeWidthInput = id('se-stroke-width'); 
			const strokeWidthValue = id('se-stroke-width-value');
			strokeWidthInput?.addEventListener('input', ()=>{ 
				if(panelUpdating) return; 
				const o = getObj(); 
				if(!o) return; 
				const v = parseInt(strokeWidthInput.value,10)||0; 
				o.set('strokeWidth', v); 
				if(strokeWidthValue) strokeWidthValue.textContent = String(v); 
				canvas.renderAll(); 
			});
			strokeWidthInput?.addEventListener('change', ()=>{ 
				if(panelUpdating) return; 
				pushHistory(); 
			});

			// Text controls
			const fontSizeInput = id('se-font-size'); 
			const fontSizeValue = id('se-font-size-value');
			fontSizeInput?.addEventListener('input', ()=>{ 
				if(panelUpdating) return; 
				const o = getObj(); 
				if(!(o instanceof fabric.IText)) return; 
				const v = parseInt(fontSizeInput.value,10)||40; 
				o.set('fontSize', v); 
				if(fontSizeValue) fontSizeValue.textContent = String(v); 
				canvas.renderAll(); 
			});
			fontSizeInput?.addEventListener('change', ()=>{ 
				if(panelUpdating) return; 
				pushHistory(); 
			});
			
		const fontFamilySelect = id('se-font-family'); 
		fontFamilySelect?.addEventListener('change', async ()=>{ 
			if(panelUpdating) return; 
			const o = getObj(); 
			if(!(o instanceof fabric.IText)) return; 
			
			const fontValue = fontFamilySelect.value;
			
			try {
				// Дожидаемся загрузки шрифта перед применением
				const fontSize = o.fontSize || 40;
				await document.fonts.load(`${fontSize}px "${fontValue}"`);
				
				console.log(`✅ Font loaded: ${fontValue}`);
			} catch(error) {
				console.warn(`⚠️ Font load failed for ${fontValue}:`, error);
			}
			
			// Применяем шрифт
			o.set('fontFamily', fontValue);
			
			// ВАЖНО: Принудительно пересчитываем размеры текста
			o.initDimensions();
			o.setCoords();
			
			// Обновляем canvas с небольшой задержкой для рендера
			setTimeout(() => {
				canvas.renderAll();
				renderLayers();
			}, 50);
			
			pushHistory();
		});
		
		const lineHeightInput = id('se-line-height'); 
			const lineHeightValue = id('se-line-height-value');
			lineHeightInput?.addEventListener('input', ()=>{ 
				if(panelUpdating) return; 
				const o = getObj(); 
				if(!(o instanceof fabric.IText)) return; 
				const v = parseFloat(lineHeightInput.value); 
				o.set('lineHeight', isFinite(v)?v:1.0); 
				if(lineHeightValue) lineHeightValue.textContent = (isFinite(v)?v:1.0).toFixed(1); 
				canvas.renderAll(); 
			});
			lineHeightInput?.addEventListener('change', ()=>{ 
				if(panelUpdating) return; 
				pushHistory(); 
			});
			
			const textAlignSelect = id('se-text-align'); 
			textAlignSelect?.addEventListener('change', ()=>{ 
				if(panelUpdating) return; 
				const o = getObj(); 
				if(!(o instanceof fabric.IText)) return; 
				o.set('textAlign', textAlignSelect.value); 
				canvas.renderAll(); 
				pushHistory(); 
			});
			
			const fontWeightToggle = id('se-font-weight'); 
			fontWeightToggle?.addEventListener('change', ()=>{ 
				if(panelUpdating) return; 
				const o = getObj(); 
				if(!(o instanceof fabric.IText)) return; 
				o.set('fontWeight', fontWeightToggle.checked ? 'bold' : 'normal'); 
				canvas.renderAll(); 
				pushHistory(); 
			});
			
		const fontStyleToggle = id('se-font-style'); 
		fontStyleToggle?.addEventListener('change', ()=>{ 
			if(panelUpdating) return; 
			const o = getObj(); 
			if(!(o instanceof fabric.IText)) return; 
			o.set('fontStyle', fontStyleToggle.checked ? 'italic' : 'normal'); 
			canvas.renderAll(); 
			pushHistory(); 
		});
		
		// === Text Gradient Controls ===
		const textGradientToggle = id('se-text-gradient-toggle');
		const textGradientControls = id('se-text-gradient-controls');
		const textGradientType = id('se-text-gradient-type');
		const textGradientColor1 = id('se-text-gradient-color1');
		const textGradientColor2 = id('se-text-gradient-color2');
		const textGradientAngle = id('se-text-gradient-angle');
		const textGradientAngleValue = id('se-text-gradient-angle-value');
		const textGradientAngleControl = id('se-text-gradient-angle-control');
		
		textGradientToggle?.addEventListener('change', ()=>{
			if(panelUpdating) return;
			const o = getObj();
			if(!(o instanceof fabric.IText)) return;
			
			if(textGradientToggle.checked) {
				textGradientControls.style.display = 'block';
				applyTextGradient(o);
			} else {
				textGradientControls.style.display = 'none';
				o.set('fill', id('se-fill')?.value || '#ffffff');
				canvas.renderAll();
			}
			pushHistory();
		});
		
		textGradientType?.addEventListener('change', ()=>{
			if(panelUpdating) return;
			const o = getObj();
			if(!(o instanceof fabric.IText)) return;
			
			// Показываем/скрываем угол для линейного градиента
			if(textGradientType.value === 'linear') {
				textGradientAngleControl.style.display = 'block';
			} else {
				textGradientAngleControl.style.display = 'none';
			}
			
			applyTextGradient(o);
			pushHistory();
		});
		
		textGradientColor1?.addEventListener('input', ()=>{
			if(panelUpdating) return;
			const o = getObj();
			if(!(o instanceof fabric.IText)) return;
			applyTextGradient(o);
		});
		
		textGradientColor1?.addEventListener('change', ()=>{
			if(panelUpdating) return;
			pushHistory();
		});
		
		textGradientColor2?.addEventListener('input', ()=>{
			if(panelUpdating) return;
			const o = getObj();
			if(!(o instanceof fabric.IText)) return;
			applyTextGradient(o);
		});
		
		textGradientColor2?.addEventListener('change', ()=>{
			if(panelUpdating) return;
			pushHistory();
		});
		
		textGradientAngle?.addEventListener('input', ()=>{
			if(panelUpdating) return;
			const o = getObj();
			if(!(o instanceof fabric.IText)) return;
			if(textGradientAngleValue) textGradientAngleValue.textContent = textGradientAngle.value + '°';
			applyTextGradient(o);
		});
		
		textGradientAngle?.addEventListener('change', ()=>{
			if(panelUpdating) return;
			pushHistory();
		});
		
		function applyTextGradient(obj) {
			if(!obj) return;
			
			const type = textGradientType?.value || 'linear';
			const color1 = textGradientColor1?.value || '#74c7ec';
			const color2 = textGradientColor2?.value || '#f9e2af';
			const angle = parseInt(textGradientAngle?.value || 90);
			
			// Вычисляем координаты для градиента
			const width = obj.width || 100;
			const height = obj.height || 50;
			
			let gradient;
			if(type === 'linear') {
				// Линейный градиент с углом
				const angleRad = (angle - 90) * Math.PI / 180;
				const x1 = width / 2 + Math.cos(angleRad) * width / 2;
				const y1 = height / 2 + Math.sin(angleRad) * height / 2;
				const x2 = width / 2 - Math.cos(angleRad) * width / 2;
				const y2 = height / 2 - Math.sin(angleRad) * height / 2;
				
				gradient = new fabric.Gradient({
					type: 'linear',
					coords: { x1, y1, x2, y2 },
					colorStops: [
						{ offset: 0, color: color1 },
						{ offset: 1, color: color2 }
					]
				});
			} else {
				// Радиальный градиент
				gradient = new fabric.Gradient({
					type: 'radial',
					coords: {
						x1: width / 2,
						y1: height / 2,
						x2: width / 2,
						y2: height / 2,
						r1: 0,
						r2: Math.max(width, height) / 2
					},
					colorStops: [
						{ offset: 0, color: color1 },
						{ offset: 1, color: color2 }
					]
				});
			}
			
			obj.set('fill', gradient);
			canvas.renderAll();
		}
		
		// === Text Shadow Controls ===
		const textShadowEnabled = id('se-text-shadow-enabled');
		const textShadowControls = id('se-text-shadow-controls');
		const textShadowColor = id('se-text-shadow-color');
		const textShadowOffsetX = id('se-text-shadow-offset-x');
		const textShadowOffsetXValue = id('se-text-shadow-offset-x-value');
		const textShadowOffsetY = id('se-text-shadow-offset-y');
		const textShadowOffsetYValue = id('se-text-shadow-offset-y-value');
		const textShadowBlur = id('se-text-shadow-blur');
		const textShadowBlurValue = id('se-text-shadow-blur-value');
		
		textShadowEnabled?.addEventListener('change', ()=>{
			if(panelUpdating) return;
			const o = getObj();
			if(!(o instanceof fabric.IText)) return;
			
			if(textShadowEnabled.checked) {
				textShadowControls.style.display = 'block';
				applyTextShadow(o);
			} else {
				textShadowControls.style.display = 'none';
				o.set('shadow', null);
				canvas.renderAll();
			}
			pushHistory();
		});
		
		textShadowColor?.addEventListener('input', ()=>{
			if(panelUpdating) return;
			const o = getObj();
			if(!(o instanceof fabric.IText)) return;
			applyTextShadow(o);
		});
		
		textShadowColor?.addEventListener('change', ()=>{
			if(panelUpdating) return;
			pushHistory();
		});
		
		textShadowOffsetX?.addEventListener('input', ()=>{
			if(panelUpdating) return;
			const o = getObj();
			if(!(o instanceof fabric.IText)) return;
			if(textShadowOffsetXValue) textShadowOffsetXValue.textContent = textShadowOffsetX.value;
			applyTextShadow(o);
		});
		
		textShadowOffsetX?.addEventListener('change', ()=>{
			if(panelUpdating) return;
			pushHistory();
		});
		
		textShadowOffsetY?.addEventListener('input', ()=>{
			if(panelUpdating) return;
			const o = getObj();
			if(!(o instanceof fabric.IText)) return;
			if(textShadowOffsetYValue) textShadowOffsetYValue.textContent = textShadowOffsetY.value;
			applyTextShadow(o);
		});
		
		textShadowOffsetY?.addEventListener('change', ()=>{
			if(panelUpdating) return;
			pushHistory();
		});
		
		textShadowBlur?.addEventListener('input', ()=>{
			if(panelUpdating) return;
			const o = getObj();
			if(!(o instanceof fabric.IText)) return;
			if(textShadowBlurValue) textShadowBlurValue.textContent = textShadowBlur.value;
			applyTextShadow(o);
		});
		
		textShadowBlur?.addEventListener('change', ()=>{
			if(panelUpdating) return;
			pushHistory();
		});
		
		function applyTextShadow(obj) {
			if(!obj) return;
			
			const color = textShadowColor?.value || '#000000';
			const offsetX = parseInt(textShadowOffsetX?.value || 2);
			const offsetY = parseInt(textShadowOffsetY?.value || 2);
			const blur = parseInt(textShadowBlur?.value || 5);
			
			obj.set('shadow', new fabric.Shadow({
				color: color,
				offsetX: offsetX,
				offsetY: offsetY,
				blur: blur
			}));
			
			canvas.renderAll();
		}
		
		// === Регистр текста ===
	const textCaseSelect = id('se-text-case');
	textCaseSelect?.addEventListener('change', ()=>{
		if(panelUpdating) return;
		const o = getObj();
		if(!(o instanceof fabric.IText)) return;
		
		const caseType = textCaseSelect.value;
		const originalText = o.text;
		let newText = originalText;
		
		if(caseType === 'uppercase') {
			newText = originalText.toUpperCase();
		} else if(caseType === 'lowercase') {
			newText = originalText.toLowerCase();
		} else if(caseType === 'capitalize') {
			newText = originalText.split(' ').map(word => 
				word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
			).join(' ');
		}
		
		o.set('text', newText);
		canvas.renderAll();
		pushHistory();
	});
		// Reflect selection changes
		canvas.on('selection:created', (e)=>{ 
			const o = e.selected && e.selected[0] ? e.selected[0] : canvas.getActiveObject(); 
			console.log('🔵 Object selected:', o?.type, o?.name);
			updatePropertiesPanel(o); 
		});
		canvas.on('selection:updated', (e)=>{ 
			const o = e.selected && e.selected[0] ? e.selected[0] : canvas.getActiveObject(); 
			console.log('🔄 Selection updated:', o?.type, o?.name);
			updatePropertiesPanel(o); 
		});
		canvas.on('selection:cleared', ()=> {
			console.log('⚪ Selection cleared');
			updatePropertiesPanel(null);
		});
	}		// === Keyboard handlers ===
		document.addEventListener('keydown', function(e){
			const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
			if (tag==='input'||tag==='textarea'||tag==='select'||e.target?.isContentEditable){
				if ((e.ctrlKey||e.metaKey) && (e.key==='z'||e.key==='Z')) { 
					e.preventDefault(); 
					trigger('se-undo'); 
					return; 
				}
				if ((e.ctrlKey||e.metaKey) && (e.key==='y' || (e.shiftKey && (e.key==='Z'||e.key==='z')))) { 
					e.preventDefault(); 
					trigger('se-redo'); 
					return; 
				}
				return;
			}
			if ((e.ctrlKey||e.metaKey) && (e.key==='z'||e.key==='Z')) { 
				e.preventDefault(); 
				trigger('se-undo'); 
				return; 
			}
			if ((e.ctrlKey||e.metaKey) && (e.key==='y'||(e.shiftKey&&(e.key==='Z'||e.key==='z')))) { 
				e.preventDefault(); 
				trigger('se-redo'); 
				return; 
			}

			const activeObject = canvas.getActiveObject(); 
			if(!activeObject || activeObject===backgroundImage) return; 
			if (activeObject instanceof fabric.IText && activeObject.isEditing) return;

			const step = e.shiftKey ? 10 : 1;
			switch(e.key){ 
				case 'ArrowUp': activeObject.top -= step; break; 
				case 'ArrowDown': activeObject.top += step; break; 
				case 'ArrowLeft': activeObject.left -= step; break; 
				case 'ArrowRight': activeObject.left += step; break; 
				default: return; 
			}
			e.preventDefault(); 
			canvas.renderAll(); 
			updatePropertiesPanel(activeObject); 
			pushHistory();
		});

		function trigger(id){ const el=document.getElementById(id); if(el) el.click(); }

		// === Mobile menu ===
		click('left-panel-toggle', ()=>{ q('.left-panel').classList.toggle('open'); });
		click('right-panel-toggle', ()=>{ q('.right-panel').classList.toggle('open'); });
		document.addEventListener('click', function(e){ 
			if(!e.target.closest('.left-panel') && !e.target.closest('#left-panel-toggle')) 
				q('.left-panel').classList.remove('open'); 
			if(!e.target.closest('.right-panel') && !e.target.closest('#right-panel-toggle')) 
				q('.right-panel').classList.remove('open'); 
		});

		// === Snapping toggle ===
		id('se-snapping-toggle')?.addEventListener('change', e=>{ snappingEnabled = e.target.checked; });


	// === Grid toggle ===
	id('se-grid-toggle')?.addEventListener('change', e=>{ 
		gridEnabled = e.target.checked; 
		renderGrid();
	});		// === Grid rendering ===
		function renderGrid(){
			// Remove existing grid if any
			const existingGrid = canvas.getObjects().find(obj => obj.name === '__grid__');
			if(existingGrid) canvas.remove(existingGrid);
			
			if(!gridEnabled) return;
			
			const gridSize = 20; // Grid cell size in pixels
		const width = canvas.width;
		const height = canvas.height;
		
		const gridLines = [];
		
		// Vertical lines
		for(let i = 0; i <= width; i += gridSize) {
			gridLines.push(['M', i, 0, 'L', i, height]);
		}
		
		// Horizontal lines
		for(let i = 0; i <= height; i += gridSize) {
			gridLines.push(['M', 0, i, 'L', width, i]);
		}
		
		const grid = new fabric.Path(gridLines.join(' '), {
			stroke: '#313244',
			strokeWidth: 1,
			selectable: false,
			evented: false,
			name: '__grid__'
		});
		
		canvas.add(grid);
	grid.sendToBack();
}

	// === Rulers rendering ===
	function renderRulers(){
		// Create ruler containers if they don't exist
		if(!id('ruler-horizontal')) {
			const container = document.createElement('div');
			container.className = 'rulers-container';
			container.innerHTML = `
				<div id="ruler-horizontal" class="ruler ruler-horizontal"></div>
				<div id="ruler-vertical" class="ruler ruler-vertical"></div>
				<div class="ruler-corner"></div>
			`;
			const editorArea = document.querySelector('.editor-area');
			if(editorArea) editorArea.prepend(container);
		}			const horizontalRuler = id('ruler-horizontal');
			const verticalRuler = id('ruler-vertical');
			
			if(!rulersEnabled) {
				if(horizontalRuler) horizontalRuler.style.display = 'none';
				if(verticalRuler) verticalRuler.style.display = 'none';
				document.querySelector('.ruler-corner')?.style.setProperty('display', 'none');
				return;
			}
			
			if(horizontalRuler) {
				horizontalRuler.style.display = 'block';
				horizontalRuler.innerHTML = '';
				const step = 50;
				for(let i = 0; i <= canvas.width; i += step) {
					const mark = document.createElement('div');
					mark.className = 'ruler-mark';
					mark.style.left = (i * zoomLevel) + 'px';
					mark.innerHTML = `<span>${i}</span>`;
					horizontalRuler.appendChild(mark);
				}
			}
			
			if(verticalRuler) {
				verticalRuler.style.display = 'block';
				verticalRuler.innerHTML = '';
				const step = 50;
				for(let i = 0; i <= canvas.height; i += step) {
					const mark = document.createElement('div');
					mark.className = 'ruler-mark';
					mark.style.top = (i * zoomLevel) + 'px';
					mark.innerHTML = `<span>${i}</span>`;
					verticalRuler.appendChild(mark);
				}
			}
			
			document.querySelector('.ruler-corner')?.style.setProperty('display', 'block');
		}

	// === Fit to view and zoom ===
	function fitToView(){ 
		const editorArea = document.querySelector('.editor-area');
		if (!editorArea) return;
		
		const viewportWidth = editorArea.clientWidth - 40;
		const viewportHeight = editorArea.clientHeight - 80;
		
		if(canvas.width === 0 || canvas.height === 0) return;
		
		const zoomX = viewportWidth / canvas.width;
		const zoomY = viewportHeight / canvas.height;
		const zoom = Math.min(zoomX, zoomY, 1);
		
		canvas.setZoom(zoom);
		zoomLevel = zoom;
		setZoomLabel();
		
		const vpt = canvas.viewportTransform;
		vpt[4] = 0;
		vpt[5] = 0;
		
		canvas.renderAll();
		renderRulers();
	}
	
	function setZoomLabel(){ 
		const el = id('se-zoom-level'); 
		if(el) el.textContent = Math.round(zoomLevel*100) + '%'; 
	}	id('se-zoom-in')?.addEventListener('click', ()=>{ 
		zoomLevel = Math.min(4, zoomLevel+0.1); 
		canvas.setZoom(zoomLevel); 
		canvas.calcOffset();
		setZoomLabel();
		renderRulers();
	});	id('se-zoom-out')?.addEventListener('click', ()=>{ 
		zoomLevel = Math.max(0.1, zoomLevel-0.1); 
		canvas.setZoom(zoomLevel); 
		canvas.calcOffset();
		setZoomLabel();
		renderRulers();
	});		id('se-reset-zoom')?.addEventListener('click', fitToView);
		
	// Zoom with mouse wheel
	canvas.on('mouse:wheel', function(opt){ 
		const delta = opt.e.deltaY; 
		let zoom = canvas.getZoom(); 
		zoom *= 0.999 ** delta; 
		if(zoom>4) zoom=4; 
		if(zoom<0.1) zoom=0.1; 
		canvas.zoomToPoint({x:opt.e.offsetX, y:opt.e.offsetY}, zoom); 
		canvas.calcOffset();
		zoomLevel = zoom; 
		setZoomLabel();
		renderRulers();
		opt.e.preventDefault(); 
		opt.e.stopPropagation(); 
	});

	// TEST VERSION: Quick zoom presets
	document.querySelectorAll('.zoom-preset').forEach(btn => {
		btn.addEventListener('click', () => {
			const zoom = parseFloat(btn.dataset.zoom);
			zoomLevel = zoom;
			canvas.setZoom(zoom);
			canvas.calcOffset();
			setZoomLabel();
			renderRulers();
		});
	});

	// TEST VERSION: Photo controls (zoom, position, lock)
	function updatePhotoControls() {
		const panel = document.getElementById('photo-controls-panel');
		if (backgroundImage && canvas.getObjects().includes(backgroundImage)) {
			panel.style.display = 'block';
			
			// Update scale value display
			const currentScale = (backgroundImage.scaleX + backgroundImage.scaleY) / 2;
			const scalePercent = Math.round(currentScale * 100);
			document.getElementById('photo-scale-value').textContent = scalePercent + '%';
			document.getElementById('photo-scale-slider').value = scalePercent;
		} else {
			panel.style.display = 'none';
		}
	}

	// Photo scale slider
	document.getElementById('photo-scale-slider')?.addEventListener('input', (e) => {
		if (!backgroundImage) return;
		const scale = parseFloat(e.target.value) / 100;
		const centerX = backgroundImage.left + (backgroundImage.width * backgroundImage.scaleX) / 2;
		const centerY = backgroundImage.top + (backgroundImage.height * backgroundImage.scaleY) / 2;
		
		backgroundImage.set({
			scaleX: scale,
			scaleY: scale,
			left: centerX - (backgroundImage.width * scale) / 2,
			top: centerY - (backgroundImage.height * scale) / 2
		});
		canvas.renderAll();
		document.getElementById('photo-scale-value').textContent = Math.round(scale * 100) + '%';
		pushHistory();
	});

	// Photo position buttons
	const moveStep = 20;
	document.getElementById('photo-move-up')?.addEventListener('click', () => {
		if (!backgroundImage) return;
		backgroundImage.set({ top: backgroundImage.top - moveStep });
		canvas.renderAll();
		pushHistory();
	});
	document.getElementById('photo-move-down')?.addEventListener('click', () => {
		if (!backgroundImage) return;
		backgroundImage.set({ top: backgroundImage.top + moveStep });
		canvas.renderAll();
		pushHistory();
	});
	document.getElementById('photo-move-left')?.addEventListener('click', () => {
		if (!backgroundImage) return;
		backgroundImage.set({ left: backgroundImage.left - moveStep });
		canvas.renderAll();
		pushHistory();
	});
	document.getElementById('photo-move-right')?.addEventListener('click', () => {
		if (!backgroundImage) return;
		backgroundImage.set({ left: backgroundImage.left + moveStep });
		canvas.renderAll();
		pushHistory();
	});
	document.getElementById('photo-center')?.addEventListener('click', () => {
		if (!backgroundImage) return;
		const canvasWidth = canvas.getWidth();
		const canvasHeight = canvas.getHeight();
		backgroundImage.set({
			left: (canvasWidth - backgroundImage.width * backgroundImage.scaleX) / 2,
			top: (canvasHeight - backgroundImage.height * backgroundImage.scaleY) / 2
		});
		canvas.renderAll();
		pushHistory();
	});

	// Photo lock toggle
	document.getElementById('photo-lock-toggle')?.addEventListener('change', (e) => {
		if (!backgroundImage) return;
		const locked = e.target.checked;
		backgroundImage.set({
			selectable: !locked,
			evented: !locked,
			lockMovementX: locked,
			lockMovementY: locked,
			lockScalingX: locked,
			lockScalingY: locked,
			lockRotation: locked
		});
		canvas.renderAll();
	});

	// === Upload handling ===
		const uploadContainer = id('se-upload-container'); 
		const fileInput = id('se-file-input');
		uploadContainer?.addEventListener('click', ()=> fileInput?.click());
		uploadContainer?.addEventListener('dragover', e=>{ 
			e.preventDefault(); 
			uploadContainer.style.borderColor='#74c7ec'; 
			uploadContainer.style.backgroundColor='#313244'; 
		});
		uploadContainer?.addEventListener('dragleave', ()=>{ 
			uploadContainer.style.borderColor='#45475a'; 
			uploadContainer.style.backgroundColor='transparent'; 
		});
		uploadContainer?.addEventListener('drop', e=>{ 
			e.preventDefault(); 
			uploadContainer.style.borderColor='#45475a'; 
			uploadContainer.style.backgroundColor='transparent'; 
			if(e.dataTransfer.files.length){ 
				handleImageUpload(e.dataTransfer.files[0]); 
			} 
		});
		fileInput?.addEventListener('change', e=>{ 
			if(e.target.files.length){ 
				handleImageUpload(e.target.files[0]); 
			} 
		});
		
	function handleImageUpload(file){ 
		if(!file.type.match('image.*')){ 
			alert('Пожалуйста, выберите файл изображения'); 
			return; 
		} 
		
		const reader = new FileReader(); 
		reader.onload = function(e){ 
			// Показываем модальное окно выбора режима размещения
			const modal = document.getElementById('photoFitModal');
			modal.style.display = 'flex';
			
			// Обработчик подтверждения
			const confirmBtn = document.getElementById('photoFitConfirm');
			const cancelBtn = document.getElementById('photoFitCancel');
			
			const handleConfirm = function() {
				const selectedMode = document.querySelector('input[name="photoFitMode"]:checked').value;
				modal.style.display = 'none';
				
				// Загружаем изображение
				fabric.Image.fromURL(e.target.result, function(img){ 
					const imgWidth = img.width;
					const imgHeight = img.height;
					const canvasWidth = 1280;
					const canvasHeight = 960;
					
					// Рассчитываем масштаб в зависимости от выбранного режима
					let scale;
					switch(selectedMode) {
						case 'cover':
							// Заполнить весь холст (может обрезаться)
							scale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
							break;
						case 'contain':
							// Вписать полностью (могут быть пустые области)
							scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
							break;
						case 'stretch':
							// Растянуть - используем отдельные scaleX и scaleY
							img.set({
								scaleX: canvasWidth / imgWidth,
								scaleY: canvasHeight / imgHeight,
								left: 0,
								top: 0,
								selectable: true,
								evented: true,
								name: 'Фоновое изображение'
							});
							
							// Проверяем, есть ли уже объекты на холсте
							const hasObjects = canvas.getObjects().length > 0;
							
							if(hasObjects && backgroundImage) {
								if(!confirm('Заменить фоновое изображение и сохранить все элементы?')) {
									return;
								}
								// Сохраняем объекты, удаляем старое фото
								const objects = canvas.getObjects().filter(obj => obj !== backgroundImage);
								canvas.clear();
								backgroundImage = img;
								canvas.add(backgroundImage);
								backgroundImage.sendToBack();
								objects.forEach(obj => canvas.add(obj));
							} else {
								// Новый проект
								canvas.clear();
								backgroundImage = img;
								canvas.add(backgroundImage);
								backgroundImage.sendToBack();
							}
							
							canvas.renderAll();
							if(gridEnabled) renderGrid();
							pushHistory();
							fitToView();
							renderLayers();
							updatePhotoControls();
							return;
					}
					
					// Для cover и contain
					img.set({
						scaleX: scale,
						scaleY: scale,
						left: (canvasWidth - imgWidth * scale) / 2,
						top: (canvasHeight - imgHeight * scale) / 2,
						selectable: true,
						evented: true,
						name: 'Фоновое изображение'
					});
					
					// Проверяем, есть ли уже объекты на холсте
					const hasObjects = canvas.getObjects().length > 0;
					
					if(hasObjects && backgroundImage) {
						if(!confirm('Заменить фоновое изображение и сохранить все элементы?')) {
							return;
						}
						// Сохраняем объекты, удаляем старое фото
						const objects = canvas.getObjects().filter(obj => obj !== backgroundImage);
						canvas.clear();
						backgroundImage = img;
						canvas.add(backgroundImage);
						backgroundImage.sendToBack();
						objects.forEach(obj => canvas.add(obj));
					} else {
						// Новый проект
						canvas.clear();
						backgroundImage = img;
						canvas.add(backgroundImage);
						backgroundImage.sendToBack();
					}
					
					canvas.renderAll();
					if(gridEnabled) renderGrid();
					pushHistory();
					fitToView();
					renderLayers();
					updatePhotoControls();
				});
				
				// Удаляем обработчики
				confirmBtn.removeEventListener('click', handleConfirm);
				cancelBtn.removeEventListener('click', handleCancel);
			};
			
			const handleCancel = function() {
				modal.style.display = 'none';
				confirmBtn.removeEventListener('click', handleConfirm);
				cancelBtn.removeEventListener('click', handleCancel);
			};
			
			confirmBtn.addEventListener('click', handleConfirm);
			cancelBtn.addEventListener('click', handleCancel);
		}; 
		reader.readAsDataURL(file); 
	}
		// === Tools ===
		click('se-add-text', ()=>{ 
			if(!bgCheck()) return; 
			
			// Используем Textbox вместо IText для автоматического переноса
			const text = new fabric.Textbox('Добавьте текст', { 
				left: canvas.width/2 - 100, 
				top: canvas.height/2 - 20, 
				width: 200,  // Фиксированная ширина для переноса
				fontFamily: 'Montserrat',  // Более универсальный шрифт
				fontSize: 40, 
				fill: '#ffffff', 
				stroke: '#000000', 
				strokeWidth: 0, 
				lineHeight: 1.2, 
				textAlign: 'left', 
				splitByGrapheme: true,  // Перенос по символам, не только по словам
				name: 'Текст '+(canvas.getObjects().length+1)
			}); 
			
			// Дожидаемся загрузки шрифта перед добавлением
			if (document.fonts && document.fonts.load) {
				document.fonts.load('40px Montserrat').then(() => {
					canvas.add(text); 
					canvas.setActiveObject(text); 
					text.enterEditing();  // Сразу активируем редактирование
					updatePropertiesPanel(text); 
					renderLayers(); 
					pushHistory(); 
				}).catch(err => {
					console.warn('Font load failed, using fallback:', err);
					text.set('fontFamily', 'Arial');
					canvas.add(text); 
					canvas.setActiveObject(text); 
					text.enterEditing();
					updatePropertiesPanel(text); 
					renderLayers(); 
					pushHistory(); 
				});
			} else {
				// Fallback для старых браузеров
				canvas.add(text); 
				canvas.setActiveObject(text); 
				text.enterEditing();
				updatePropertiesPanel(text); 
				renderLayers(); 
				pushHistory(); 
			}
		});
		
		id('se-add-image')?.addEventListener('click', function(){ 
			const finput = document.createElement('input'); 
			finput.type = 'file'; 
			finput.accept = '.png, .svg, .jpg, .jpeg, .webp'; 
			finput.style.display = 'none'; 
			document.body.appendChild(finput); 
			finput.click(); 
			finput.addEventListener('change', function(e){ 
				if(e.target.files && e.target.files[0]){ 
					const file = e.target.files[0]; 
					if(!file.type.match('image.*')){ 
						alert('Пожалуйста, выберите файл изображения (PNG, SVG, JPEG, WEBP)'); 
						return; 
					} 
					const reader = new FileReader(); 
					reader.onload = function(ev){ 
						fabric.Image.fromURL(ev.target.result, function(img){ 
							const scale = 0.5; 
							img.set({ 
								left: canvas.width/2 - (img.width*scale)/2, 
								top: canvas.height/2 - (img.height*scale)/2, 
								scaleX: scale, 
								scaleY: scale, 
								name: 'Изображение '+(canvas.getObjects().length+1), 
								cornerStyle: 'circle', 
								transparentCorners: false, 
								cornerColor: '#74c7ec', 
								cornerSize: 10 
							}); 
							canvas.add(img); 
							canvas.setActiveObject(img); 
							updatePropertiesPanel(img); 
							renderLayers(); 
							canvas.renderAll(); 
							pushHistory(); 
						}); 
					}; 
					reader.readAsDataURL(file); 
				} 
				document.body.removeChild(finput); 
			}); 
		});
		
		click('se-add-rectangle', ()=>{ 
			if(!bgCheck()) return; 
			const rect = new fabric.Rect({ 
				left: canvas.width/2, 
				top: canvas.height/2, 
				width: 100, 
				height: 100, 
				fill: '#74c7ec', 
				stroke: '#000000', 
				strokeWidth: 1, 
				name: 'Прямоугольник '+(canvas.getObjects().length+1)
			}); 
			canvas.add(rect); 
			canvas.setActiveObject(rect); 
			updatePropertiesPanel(rect); 
			renderLayers(); 
			pushHistory(); 
		});
		
		click('se-delete-selected', ()=>{ 
			const o = canvas.getActiveObject(); 
			if(o && o !== backgroundImage){ 
				canvas.remove(o); 
				renderLayers(); 
				pushHistory(); 
			} 
		});
		
		click('se-clone-selected', ()=>{ 
			const o = canvas.getActiveObject(); 
			if(o && o !== backgroundImage){ 
				o.clone(function(cloned){ 
					cloned.set({ 
						left: cloned.left+10, 
						top: cloned.top+10, 
						name: o.name+' (копия)' 
					}); 
					canvas.add(cloned); 
					canvas.setActiveObject(cloned); 
					updatePropertiesPanel(cloned); 
					renderLayers(); 
					pushHistory(); 
				}); 
			} 
		});
		
		click('se-clear-canvas', ()=>{ 
			if(confirm('Вы уверены, что хотите очистить холст? Это также удалит автосохранение.')){ 
				pushHistory(); 
				canvas.clear(); 
				backgroundImage = null; 
				// id('se-canvas-width').value removed 
				// id('se-canvas-height').value removed 
				canvas.setWidth(800); 
				canvas.setHeight(500);
				renderLayers();
				// Clear autosave
				try {
					localStorage.removeItem(AUTOSAVE_KEY);
				} catch(e) {}
			} 
		});

		// === Undo/Redo ===
		click('se-undo', ()=>{ 
			if(history.length===0) return; 
			const current = makeSnapshot(); 
			const snap = history.pop(); 
			redoStack.push(current); 
			applySnapshot(snap); 
		});
		
		click('se-redo', ()=>{ 
			if(redoStack.length===0) return; 
			const current = makeSnapshot(); 
			const snap = redoStack.pop(); 
			history.push(current); 
			applySnapshot(snap); 
		});

		// === Export ===
		click('se-export-image', ()=>{ 
			// Check if canvas has any content (objects or background)
			const hasObjects = canvas.getObjects().length > 0;
			const hasBackground = canvas.backgroundImage || backgroundImage;
			
			if(!hasObjects && !hasBackground){ 
				alert('Нет изображения для экспорта'); 
				return; 
			} 
			
			try {
				const originalZoom = canvas.getZoom(); 
				const originalVpt = canvas.viewportTransform.slice(); 
				canvas.setZoom(1); 
				canvas.viewportTransform = [1,0,0,1,0,0]; 
				const dataURL = canvas.toDataURL({format:'png', quality:0.9}); 
				canvas.setZoom(originalZoom); 
				canvas.viewportTransform = originalVpt; 
				const link = document.createElement('a'); 
				link.href = dataURL; 
				link.download = 'avito-editor-image.png'; 
				link.click(); 
			} catch(error) {
				console.error('Export error:', error);
				alert('Ошибка экспорта: ' + error.message + '\n\nВозможно, изображения загружаются. Подождите пару секунд и попробуйте снова.');
			}
		});

		// === Snapping guides ===
		function clearGuides(){ 
			try{ 
				const ctx = canvas.contextTop; 
				if(!ctx) return; 
				ctx.clearRect(0,0,canvas.getWidth(),canvas.getHeight()); 
			} catch(e){} 
		}
		
		function drawVGuide(x){ 
			const ctx = canvas.contextTop; 
			if(!ctx) return; 
			ctx.save(); 
			ctx.strokeStyle = '#74c7ec'; 
			ctx.lineWidth = 1; 
			ctx.setLineDash([5,5]); 
			ctx.beginPath(); 
			ctx.moveTo(x,0); 
			ctx.lineTo(x,canvas.height); 
			ctx.stroke(); 
			ctx.restore(); 
		}
		
		function drawHGuide(y){ 
			const ctx = canvas.contextTop; 
			if(!ctx) return; 
			ctx.save(); 
			ctx.strokeStyle = '#74c7ec'; 
			ctx.lineWidth = 1; 
			ctx.setLineDash([5,5]); 
			ctx.beginPath(); 
			ctx.moveTo(0,y); 
			ctx.lineTo(canvas.width,y); 
			ctx.stroke(); 
			ctx.restore(); 
		}
		
		function snapObjectToGrid(obj){ 
			if(!snappingEnabled) return; 
			const snapThreshold = 10; 
			const objects = canvas.getObjects(); 
			
			if(Math.abs(obj.left)<snapThreshold) obj.left=0; 
			if(Math.abs(obj.top)<snapThreshold) obj.top=0; 
			if(Math.abs(canvas.width - (obj.left + obj.width*obj.scaleX)) < snapThreshold){ 
				obj.left = canvas.width - obj.width*obj.scaleX; 
			} 
			if(Math.abs(canvas.height - (obj.top + obj.height*obj.scaleY)) < snapThreshold){ 
				obj.top = canvas.height - obj.height*obj.scaleY; 
			} 
			if(Math.abs(obj.left - (canvas.width - obj.width*obj.scaleX)/2) < snapThreshold){ 
				obj.left = (canvas.width - obj.width*obj.scaleX)/2; 
			} 
			if(Math.abs(obj.top - (canvas.height - obj.height*obj.scaleY)/2) < snapThreshold){ 
				obj.top = (canvas.height - obj.height*obj.scaleY)/2; 
			} 
			
			objects.forEach(other=>{ 
				if(other===obj||other===backgroundImage) return; 
				if(Math.abs(obj.left - other.left) < snapThreshold) obj.left = other.left; 
				const objRight = obj.left + obj.width*obj.scaleX; 
				const otherRight = other.left + other.width*other.scaleX; 
				if(Math.abs(objRight - otherRight) < snapThreshold) obj.left = otherRight - obj.width*obj.scaleX; 
				if(Math.abs(obj.top - other.top) < snapThreshold) obj.top = other.top; 
				const objBottom = obj.top + obj.height*obj.scaleY; 
				const otherBottom = other.top + other.height*other.scaleY; 
				if(Math.abs(objBottom - otherBottom) < snapThreshold) obj.top = otherBottom - obj.height*obj.scaleY; 
				const objCenterX = obj.left + (obj.width*obj.scaleX)/2; 
				const otherCenterX = other.left + (other.width*other.scaleX)/2; 
				if(Math.abs(objCenterX - otherCenterX) < snapThreshold) obj.left = otherCenterX - (obj.width*obj.scaleX)/2; 
				const objCenterY = obj.top + (obj.height*obj.scaleY)/2; 
				const otherCenterY = other.top + (other.height*other.scaleY)/2; 
				if(Math.abs(objCenterY - otherCenterY) < snapThreshold) obj.top = otherCenterY - (obj.height*obj.scaleY)/2; 
			}); 
		}
		
		canvas.on('object:moving', function(e){ 
			const obj = e.target; 
			clearGuides(); 
			if(snappingEnabled){ 
				snapObjectToGrid(obj); 
				const objCenterX = obj.left + (obj.width * obj.scaleX)/2; 
				const objCenterY = obj.top + (obj.height * obj.scaleY)/2; 
				const cX = canvas.width/2, cY = canvas.height/2; 
				if(Math.abs(objCenterX - cX) < 10) drawVGuide(cX); 
				if(Math.abs(objCenterY - cY) < 10) drawHGuide(cY); 
			} 
		});
		
		canvas.on('mouse:up', function(){ 
			clearGuides(); 
		});
		
		canvas.on('object:modified', function(e){ 
		// Пересчитываем градиент при изменении размера подложки
		const obj = e.target;
		if(obj && obj._advancedShape && obj._fillType === 'gradient') {
			applyGradientToObject(obj);
		}
		pushHistory();
		autoSave();
	});
	canvas.on('object:added', function(e){
		const obj = e.target;
		// Skip service objects (grid)
		if(obj && obj.name === '__grid__') {
			return;
		}
		renderGrid(); // Ensure grid stays at back
	});		// === Autosave with indicator ===
	const autosaveIndicator = document.getElementById('autosave-indicator');
	const autosaveText = document.getElementById('autosave-text');
	let lastAutosaveTime = null;
	
	function updateAutosaveIndicator(status, message) {
		if (!autosaveIndicator || !autosaveText) return;
		
		autosaveIndicator.classList.remove('saving', 'error');
		autosaveIndicator.style.display = 'flex';
		
		if (status === 'saving') {
			autosaveIndicator.classList.add('saving');
			autosaveIndicator.querySelector('i').className = 'fas fa-spinner';
			autosaveText.textContent = message || 'Сохранение...';
		} else if (status === 'success') {
			autosaveIndicator.querySelector('i').className = 'fas fa-check-circle';
			lastAutosaveTime = new Date();
			const timeStr = lastAutosaveTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
			autosaveText.textContent = `Сохранено в ${timeStr}`;
		} else if (status === 'error') {
			autosaveIndicator.classList.add('error');
			autosaveIndicator.querySelector('i').className = 'fas fa-exclamation-circle';
			autosaveText.textContent = message || 'Ошибка сохранения';
		}
	}
	
	function autoSave(){
		if(!backgroundImage) return;
		
		updateAutosaveIndicator('saving');
		
		try {
			// Сохраняем полный проект с base64 картинкой
			const projectData = {
				version: '1.0',
				timestamp: Date.now(),
				canvas: {
					width: canvas.getWidth(),
					height: canvas.getHeight(),
					backgroundColor: canvas.backgroundColor || '#11111b'
				},
				backgroundImage: backgroundImage ? {
				src: backgroundImage.getSrc ? backgroundImage.getSrc() : (backgroundImage._originalElement?.src || ''),
				width: backgroundImage.width,
				height: backgroundImage.height
			} : null,
			objects: canvas.toJSON(['name','_advancedShape','_cornerRadius','_radiusTL','_radiusTR','_radiusBL','_radiusBR','_initialWidth','_initialHeight','_fillType','_gradientType','_gradientColors','_gradientOpacities','_gradientAngle']),
			objectsCount: canvas.getObjects().length
		};			localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(projectData));
			console.log('💾 Autosaved at', new Date().toLocaleTimeString());
			updateAutosaveIndicator('success');
		} catch(e) {
			console.warn('⚠️ Autosave failed:', e.message);
			// Если переполнение - пробуем без картинки
			if(e.name === 'QuotaExceededError') {
				try {
					const lightData = {
						version: '1.0',
						timestamp: Date.now(),
						canvas: {
							width: canvas.getWidth(),
							height: canvas.getHeight(),
							backgroundColor: canvas.backgroundColor || '#11111b'
						},
						backgroundImage: { width: backgroundImage.width, height: backgroundImage.height },
						objects: canvas.toJSON(['name','_advancedShape','_cornerRadius','_radiusTL','_radiusTR','_radiusBL','_radiusBR','_initialWidth','_initialHeight','_fillType','_gradientType','_gradientColors','_gradientOpacities','_gradientAngle']),
						objectsCount: canvas.getObjects().length
					};
					localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(lightData));
					console.log('💾 Autosaved (without image) at', new Date().toLocaleTimeString());
					updateAutosaveIndicator('success');
				} catch(e2) {
					console.error('❌ Cannot save even without image:', e2.message);
					updateAutosaveIndicator('error', 'Нет места');
				}
			} else {
				updateAutosaveIndicator('error');
			}
		}
	}
	
	

	// Autosave interval
	setInterval(autoSave, AUTOSAVE_INTERVAL);

	// Save on page unload
	window.addEventListener('beforeunload', autoSave);

		// === Save/Load project ===
		click('se-save-project', ()=>{ 
			if(!bgCheck()) return; 
			function formatDateTime(){ 
				const n = new Date(); 
				const y = n.getFullYear(); 
				const m = String(n.getMonth()+1).padStart(2,'0'); 
				const d = String(n.getDate()).padStart(2,'0'); 
				const h = String(n.getHours()).padStart(2,'0'); 
				const mi = String(n.getMinutes()).padStart(2,'0'); 
				const s = String(n.getSeconds()).padStart(2,'0'); 
				return `${y}${m}${d}_${h}${mi}${s}`; 
			} 
			const projectData = { 
				version: '1.0', 
				canvas: { 
					width: canvas.getWidth(), 
					height: canvas.getHeight(), 
					backgroundColor: canvas.backgroundColor || '#11111b' 
				}, 
				backgroundImage: { 
					src: backgroundImage.getSrc(), 
					width: backgroundImage.width, 
					height: backgroundImage.height 
				}, 
				objects: canvas.toJSON(['name','_advancedShape','_cornerRadius','_radiusTL','_radiusTR','_radiusBL','_radiusBR','_initialWidth','_initialHeight','_fillType','_gradientType','_gradientColors','_gradientOpacities','_gradientAngle','selectable','evented','lockMovementX','lockMovementY']), 
						metadata: { 
					created: new Date().toISOString() 
				} 
			}; 
			const blob = new Blob([JSON.stringify(projectData)], {type:'application/json'}); 
			const url = URL.createObjectURL(blob); 
			const link = document.createElement('a'); 
			link.href = url; 
			link.download = `avito-editor-project_${formatDateTime()}.json`; 
			link.click(); 
			URL.revokeObjectURL(url); 
		});

		click('se-load-project', ()=> id('se-project-input')?.click());
		
		// History button handler
		
		
		id('se-project-input')?.addEventListener('change', (e)=>{
			if(e.target.files.length){ 
				const reader = new FileReader(); 
				reader.onload = function(ev){ 
					try{ 
						const projectData = JSON.parse(ev.target.result); 
						const err = validateProjectData(projectData); 
						if(err){ 
							alert('Ошибка: '+err); 
							return; 
						} 
						isProjectLoading = true; 
						canvas.setWidth(projectData.canvas.width); 
						canvas.setHeight(projectData.canvas.height); 
						canvas.calcOffset(); // Синхронизация координат
						canvas.backgroundColor = projectData.canvas.backgroundColor || '#11111b'; 
						// id('se-canvas-width').value removed 
						// id('se-canvas-height').value removed 
						fabric.Image.fromURL(projectData.backgroundImage.src, function(img){ 
							img.set({ 
								width: projectData.backgroundImage.width, 
								height: projectData.backgroundImage.height, 
								scaleX: 1, 
								scaleY: 1 
							}); 
							backgroundImage = img; 
							backgroundImage.set({selectable:false, evented:false, name:'Фоновое изображение'}); 
							canvas.setBackgroundImage(backgroundImage, function(){ 
								canvas.loadFromJSON(projectData.objects, function(){ 
									restoreGradients();
									
									
									
									setTimeout(()=>{ 
										fitToView(); 
										isProjectLoading = false; 
										renderLayers(); 
										alert('Проект успешно загружен!'); 
										pushHistory(); 
									}, 50); 
								}); 
							}); 
						}, {crossOrigin:'Anonymous'}); 
					} catch(error){ 
						console.error('Ошибка при загрузке проекта:', error); 
						alert('Ошибка при загрузке проекта: ' + error.message); 
						isProjectLoading = false; 
					} 
				}; 
				reader.readAsText(e.target.files[0]); 
			} 
		});
		
		function validateProjectData(d){ 
			if(!d||typeof d!=='object') return 'Неверный формат файла'; 
			if(!d.canvas||typeof d.canvas.width!=='number'||typeof d.canvas.height!=='number') return 'Отсутствуют параметры холста'; 
			if(!d.backgroundImage||typeof d.backgroundImage.src!=='string') return 'Отсутствует фоновое изображение'; 
			if(!d.objects) return 'Отсутствуют объекты'; 
			return null; 
		}

		// === Layers rendering ===
		function renderLayers(){
			if(isProjectLoading) return;
			const layersContainer = id('se-layers-container');
			if(!layersContainer) return;
			layersContainer.innerHTML = '';
			const objects = canvas.getObjects();
			
			if(backgroundImage){
				const li = document.createElement('div');
				li.className = 'layer-item';
				li.innerHTML = '<div class="layer-icon"><i class="fas fa-image"></i></div><div class="layer-name">Фоновое изображение</div><div class="layer-visibility"><i class="fas fa-eye"></i></div>';
				layersContainer.appendChild(li);
			}
			
			for(let i = objects.length - 1; i >= 0; i--){
				const obj = objects[i];
				if(obj === backgroundImage) continue;
				const li = document.createElement('div');
				li.className = 'layer-item' + ((obj.type==='group' || obj instanceof fabric.Group)?' group':'');
				if(obj === canvas.getActiveObject()) li.classList.add('selected');
				if(obj.visible === false) li.classList.add('hidden');
				if(obj.lockMovementX) li.classList.add('locked');
				
				let iconClass = (obj.type==='group' || obj instanceof fabric.Group) ? 'fa-object-group' : 'fa-shapes';
				if(obj instanceof fabric.IText) iconClass = 'fa-font';
				else if(obj instanceof fabric.Rect) iconClass = 'fa-square';
				else if(obj instanceof fabric.Circle) iconClass = 'fa-circle';
				else if(obj instanceof fabric.Triangle) iconClass = 'fa-play';
				else if ((fabric.Group && obj instanceof fabric.Group) || obj.isIcon) iconClass = 'fa-icons';
				
				li.innerHTML = `<div class="layer-icon"><i class="fas ${iconClass}"></i></div><div class="layer-name">${escapeHtml(obj.name || ('Объект '+(i+1)))}</div><div class="layer-visibility"><i class="fas ${obj.visible !== false ? 'fa-eye' : 'fa-eye-slash'}"></i></div><div class="layer-menu"><button class="layer-menu-btn"><i class="fas fa-ellipsis-v"></i></button><div class="layer-menu-content"><button data-action="toggle-visibility"><i class="fas fa-eye"></i> ${obj.visible !== false ? 'Скрыть' : 'Показать'}</button><button data-action="toggle-lock"><i class="fas ${obj.lockMovementX ? 'fa-lock' : 'fa-lock-open'}"></i> ${obj.lockMovementX ? 'Разблокировать' : 'Заблокировать'}</button><button data-action="duplicate"><i class="fas fa-copy"></i> Дублировать</button><button data-action="rename"><i class="fas fa-tag"></i> Переименовать</button><button data-action="delete"><i class="fas fa-trash"></i> Удалить</button></div></div>`;

				// Menu toggle
				const menuEl = li.querySelector('.layer-menu');
				const menuBtn = li.querySelector('.layer-menu-btn');
				menuBtn.addEventListener('click', (e)=>{
					e.stopPropagation();
					layersContainer.querySelectorAll('.layer-menu.open').forEach(m=>{ if(m!==menuEl) m.classList.remove('open'); });
					menuEl.classList.toggle('open');
				});
				menuEl.addEventListener('click', (e)=> e.stopPropagation());
				
				li.addEventListener('click', (e)=>{
					if(!e.target.closest('.layer-menu') && !e.target.closest('.layer-visibility')){
						canvas.setActiveObject(obj);
						canvas.renderAll();
						updatePropertiesPanel(obj);
						renderLayers();
					}
				});
				
				const visBtn = li.querySelector('.layer-visibility');
				visBtn.addEventListener('click', (e)=>{ 
					e.stopPropagation(); 
					obj.visible = !obj.visible; 
					canvas.renderAll(); 
					renderLayers(); 
				});
				
				li.querySelectorAll('.layer-menu-content button').forEach(menuItem=>{
					menuItem.addEventListener('click', (e)=>{
						e.stopPropagation();
						const action = menuItem.getAttribute('data-action');
						switch(action){
							case 'toggle-visibility': obj.visible = !obj.visible; break;
							case 'toggle-lock': 
								const isLocked = obj.lockMovementX; 
								obj.set({ 
									lockMovementX: !isLocked, 
									lockMovementY: !isLocked, 
									selectable: isLocked, 
									evented: isLocked 
								}); 
								break;
							case 'duplicate': 
								obj.clone(function(cloned){ 
									cloned.set({ 
										left: cloned.left+10, 
										top: cloned.top+10, 
										name: obj.name+' (копия)' 
									}); 
									canvas.add(cloned); 
									canvas.setActiveObject(cloned); 
									updatePropertiesPanel(cloned); 
								}); 
								break;
							case 'rename': 
								const newName = prompt('Введите новое имя:', obj.name || ''); 
								if(typeof newName==='string'){ 
									obj.name = newName.trim(); 
								} 
								break;
							case 'delete': 
								canvas.remove(obj); 
								break;
						}
						canvas.renderAll();
						renderLayers();
					});
				});
				
				layersContainer.appendChild(li);
			}
		}

		// === Layer order controls ===
		(function setupLayerOrderControls(){
			function getActive(){ 
				const o = canvas.getActiveObject(); 
				return (o && o !== backgroundImage) ? o : null; 
			}
			click('se-move-up', ()=>{ 
				const o = getActive(); 
				if(!o) return; 
				canvas.bringForward(o); 
				canvas.renderAll(); 
				renderLayers(); 
				pushHistory(); 
			});
			click('se-move-down', ()=>{ 
				const o = getActive(); 
				if(!o) return; 
				canvas.sendBackwards(o); 
				canvas.renderAll(); 
				renderLayers(); 
				pushHistory(); 
			});
			click('se-move-to-front', ()=>{ 
				const o = getActive(); 
				if(!o) return; 
				canvas.bringToFront(o); 
				canvas.renderAll(); 
				renderLayers(); 
				pushHistory(); 
			});
			click('se-move-to-back', ()=>{ 
				const o = getActive(); 
				if(!o) return; 
				canvas.sendToBack(o); 
				canvas.renderAll(); 
				renderLayers(); 
				pushHistory(); 
			});
		})();

		// === Tabs (properties/layers) ===
		(function setupTabs(){
			const tabs = qAll('.supa-editor .tab');
			const contents = qAll('.supa-editor .tab-content');
			function showTab(name){
				contents.forEach(c=> c.style.display='none');
				const el = id('se-'+name+'-tab'); 
				if(el) el.style.display='block';
				tabs.forEach(t=> t.classList.toggle('active', t.getAttribute('data-tab')===name));
			}
			tabs.forEach(tab=>{ 
				tab.addEventListener('click', function(){ 
					const name = this.getAttribute('data-tab'); 
					showTab(name); 
				}); 
			});
			// Ensure default
			const active = tabs.find(t=> t.classList.contains('active')); 
			showTab(active ? active.getAttribute('data-tab') : 'properties');
		})();

		// === Helpers ===
		function id(x){ return document.getElementById(x); }
		function q(s){ return document.querySelector(s); }
		function qAll(s){ return Array.from(document.querySelectorAll(s)); }
		function click(id_, fn){ const el=id(id_); if(el) el.addEventListener('click', fn); }
		function bgCheck(){ 
			if(!backgroundImage){ 
				alert('Сначала загрузите изображение'); 
				return false; 
			} 
			return true; 
		}
		function escapeHtml(str){ 
			if(typeof str!=='string') return ''; 
			return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); 
		}

		// === Initialize ===
		setupPropertyControls();
		updatePropertiesPanel(null);
		fitToView(); 
		renderLayers();
		window.addEventListener('resize', fitToView);

	// Function to restore autosave
	function restoreAutosave() {
		const saved = localStorage.getItem(AUTOSAVE_KEY);
		if(!saved) return;
		
		try {
			const projectData = JSON.parse(saved);
			if(!projectData || !projectData.backgroundImage) return;
			
			// Если есть src - полное восстановление с фоном
			if(projectData.backgroundImage.src) {
				console.log('📂 Полное восстановление с фоном...');
				
				fabric.Image.fromURL(projectData.backgroundImage.src, function(img){
					if(!img) {
						console.error('❌ Не удалось загрузить фон');
						return;
					}
					
					canvas.clear();
					canvas.setWidth(projectData.canvas.width);
					canvas.setHeight(projectData.canvas.height);
					canvas.calcOffset();
					canvas.backgroundColor = projectData.canvas.backgroundColor;
					
					backgroundImage = img;
					backgroundImage.set({selectable:false, evented:false, name:'Фоновое изображение'});
					canvas.setBackgroundImage(backgroundImage, ()=>{
						if(gridEnabled) renderGrid();
						canvas.loadFromJSON(projectData.objects, ()=>{
							restoreGradients();
							canvas.renderAll();
							fitToView();
							renderLayers();
							pushHistory();
							console.log('✅ Автосохранение восстановлено (' + projectData.objectsCount + ' объектов)');
						});
					});
				}, null, {crossOrigin: 'anonymous'});
			} else {
				// Если нет src - только объекты (требует загрузки фона)
				if(!backgroundImage) {
					console.log('⏳ Нет фона - загрузите изображение для восстановления');
					return;
				}
				
				console.log('📂 Восстановление объектов...');
				const objects = canvas.getObjects().filter(obj => obj !== backgroundImage && obj.name !== '__grid__');
				objects.forEach(obj => canvas.remove(obj));
				
				canvas.loadFromJSON(projectData.objects, () => {
					restoreGradients();
					canvas.renderAll();
					renderLayers();
					pushHistory();
					console.log('✅ Объекты восстановлены (' + projectData.objectsCount + ' шт)');
				});
			}
		} catch(e) {
			console.warn('⚠️ Ошибка восстановления:', e);
		}
	}

	// Try restore on page load (if background already loaded)
	setTimeout(restoreAutosave, 1500);

					// === EMOJI PICKER ===
			click('se-add-emoji', () => {
				if(!bgCheck()) return;
				showEmojiPicker();
			});

			function showEmojiPicker() {
				const modal = id('emoji-modal');
				const grid = id('emoji-grid');
				const categories = id('emoji-categories');
				const search = id('emoji-search');
				
				// Render categories
				categories.innerHTML = '';
				Object.keys(EMOJI_DATA).forEach(cat => {
					const btn = document.createElement('button');
					btn.textContent = cat;
					btn.className = 'button button-secondary';
					btn.style.cssText = 'padding: 5px 10px; font-size: 12px;';
					btn.onclick = () => renderEmojiCategory(cat);
					categories.appendChild(btn);
				});
				
				// Render all emojis initially
				renderEmojiCategory(Object.keys(EMOJI_DATA)[0]);
				
				// Search functionality
				search.oninput = (e) => {
					const searchTerm = e.target.value.toLowerCase();
					if(!searchTerm) {
						renderEmojiCategory(Object.keys(EMOJI_DATA)[0]);
						return;
					}
					
					grid.innerHTML = '';
					Object.values(EMOJI_DATA).flat().forEach(emoji => {
						const btn = createEmojiButton(emoji);
						grid.appendChild(btn);
					});
				};
				
				modal.style.display = 'flex';
			}

			function renderEmojiCategory(category) {
				const grid = id('emoji-grid');
				grid.innerHTML = '';
				EMOJI_DATA[category].forEach(emoji => {
					const btn = createEmojiButton(emoji);
					grid.appendChild(btn);
				});
			}

			function createEmojiButton(emoji) {
				const btn = document.createElement('button');
				btn.textContent = emoji;
				btn.style.cssText = 'font-size: 24px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; transition: all 0.2s;';
				btn.onmouseenter = () => btn.style.background = '#f0f0f0';
				btn.onmouseleave = () => btn.style.background = 'white';
				btn.onclick = () => addEmojiToCanvas(emoji);
				return btn;
			}

			function addEmojiToCanvas(emoji) {
				const text = new fabric.Text(emoji, {
					left: canvas.width / 2,
					top: canvas.height / 2,
					fontSize: 80,
					textBaseline: 'top',
					originX: 'center',
					originY: 'center',
					name: 'Emoji ' + (canvas.getObjects().length + 1)
				});
				
				canvas.add(text);
				canvas.setActiveObject(text);
				updatePropertiesPanel(text);
				renderLayers();
				pushHistory();
				id('emoji-modal').style.display = 'none';
			}

			// === FONT AWESOME ICONS ===
			click('se-add-icon', () => {
				if(!bgCheck()) return;
				showIconPicker();
			});

			function showIconPicker() {
				const modal = id('icon-modal');
				const grid = id('icon-grid');
				const categories = id('icon-categories');
				const search = id('icon-search');
				const colorPicker = id('icon-color');
				
				// Render categories
				categories.innerHTML = '';
				Object.keys(FONTAWESOME_ICONS).forEach(cat => {
					const btn = document.createElement('button');
					btn.textContent = cat;
					btn.className = 'button button-secondary';
					btn.style.cssText = 'padding: 5px 10px; font-size: 12px;';
					btn.onclick = () => renderIconCategory(cat, colorPicker.value);
					categories.appendChild(btn);
				});
				
				// Render first category
				renderIconCategory(Object.keys(FONTAWESOME_ICONS)[0], colorPicker.value);
				
				// Color change
				colorPicker.oninput = () => {
					const activeCategory = Object.keys(FONTAWESOME_ICONS)[0];
					renderIconCategory(activeCategory, colorPicker.value);
				};
				
				// Search functionality
				search.oninput = (e) => {
					const searchTerm = e.target.value.toLowerCase();
					if(!searchTerm) {
						renderIconCategory(Object.keys(FONTAWESOME_ICONS)[0], colorPicker.value);
						return;
					}
					
					grid.innerHTML = '';
					Object.values(FONTAWESOME_ICONS).flat().forEach(icon => {
						if(icon.name.includes(searchTerm)) {
							const btn = createIconButton(icon, colorPicker.value);
							grid.appendChild(btn);
						}
					});
				};
				
				modal.style.display = 'flex';
			}

			function renderIconCategory(category, color) {
				const grid = id('icon-grid');
				grid.innerHTML = '';
				FONTAWESOME_ICONS[category].forEach(icon => {
					const btn = createIconButton(icon, color);
					grid.appendChild(btn);
				});
			}

			function createIconButton(icon, color) {
				const btn = document.createElement('button');
				const fontFamily = icon.category === 'brands' ? 'Font Awesome 6 Brands' : 'Font Awesome 6 Free';
				const fontWeight = icon.category === 'brands' ? 400 : 900;
				
				// Используем unicode напрямую для отображения
				const span = document.createElement('span');
				span.textContent = icon.unicode;
				span.style.cssText = `font-family: '${fontFamily}'; font-weight: ${fontWeight}; font-size: 24px; color: ${color};`;
				
				btn.appendChild(span);
				btn.title = icon.name;
				btn.style.cssText = 'padding: 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; transition: all 0.2s;';
				btn.onmouseenter = () => btn.style.background = '#f0f0f0';
				btn.onmouseleave = () => btn.style.background = 'white';
				btn.onclick = () => addIconToCanvas(icon, color);
				return btn;
			}

			function addIconToCanvas(icon, color) {
				const fontFamily = icon.category === 'brands' ? 'Font Awesome 6 Brands' : 'Font Awesome 6 Free';
				const fontWeight = icon.category === 'brands' ? 400 : 900;
				
				const text = new fabric.Text(icon.unicode, {
					left: canvas.width / 2,
					top: canvas.height / 2,
					fontSize: 80,
					fontFamily: fontFamily,
					fontWeight: fontWeight,
					fill: color,
					textBaseline: 'top',
					originX: 'center',
					originY: 'center',
					name: icon.name.replace('fa-', '')
				});
				
				canvas.add(text);
				canvas.setActiveObject(text);
				updatePropertiesPanel(text);
				renderLayers();
				pushHistory();
				id('icon-modal').style.display = 'none';
			}

			// === SVG LIBRARY ===
			click('se-add-svg', () => {
				if(!bgCheck()) return;
				showSVGPicker();
			});

		function showSVGPicker() {
			const modal = id('svg-modal');
			const grid = id('svg-grid');
			const search = id('svg-search');
			
			// Очищаем сетку
			grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #cdd6f4;">Загрузка SVG...</div>';
			
			// Загружаем SVG файлы из библиотеки
			loadSVGLibrary().then(svgs => {
				grid.innerHTML = '';
				if (svgs.length === 0) {
					grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #f38ba8;">📁 Положите SVG файлы в папку svg-library/</div>';
					return;
				}
				
				svgs.forEach(svg => {
					const btn = createSVGButton(svg);
					grid.appendChild(btn);
				});
				
				// Search
				let allSVGs = svgs;
				search.oninput = (e) => {
					const query = e.target.value.toLowerCase();
					const filtered = allSVGs.filter(svg => 
						svg.name.toLowerCase().includes(query)
					);
					grid.innerHTML = '';
					filtered.forEach(svg => {
						const btn = createSVGButton(svg);
						grid.appendChild(btn);
					});
				};
			}).catch(err => {
				console.error('Ошибка загрузки SVG:', err);
				grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #f38ba8;">❌ Ошибка загрузки SVG</div>';
			});
			
			modal.style.display = 'flex';
		}
		
		// Загрузка SVG из папки
		async function loadSVGLibrary() {
			const svgs = [];
			const config = window.SVG_LIBRARY_CONFIG || {basePath: './svg-library/', files: []};
			
			for (const filename of config.files) {
				try {
					const response = await fetch(config.basePath + filename);
					if (response.ok) {
						const data = await response.text();
						const name = filename.replace('.svg', '').replace(/-/g, ' ');
						svgs.push({name, data, filename});
					}
				} catch (e) {
					console.warn('Не удалось загрузить:', filename, e);
				}
			}
			
			return svgs;
		}			function createSVGButton(svgData) {
				const btn = document.createElement('button');
				btn.innerHTML = svgData.data;
				btn.title = svgData.name;
				btn.style.cssText = 'padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;';
				btn.querySelector('svg').style.cssText = 'width: 60px; height: 60px;';
				btn.onmouseenter = () => btn.style.background = '#f0f0f0';
				btn.onmouseleave = () => btn.style.background = 'white';
				btn.onclick = () => addSVGToCanvas(svgData);
				return btn;
			}

			function addSVGToCanvas(svgData) {
				fabric.loadSVGFromString(svgData.data, (objects, options) => {
					const svg = fabric.util.groupSVGElements(objects, options);
					svg.set({
						left: canvas.width / 2,
						top: canvas.height / 2,
						originX: 'center',
						originY: 'center',
						name: svgData.name || 'SVG ' + (canvas.getObjects().length + 1)
					});
					
					// Масштабируем до разумного размера
					const maxSize = 200;
					const scale = Math.min(maxSize / svg.width, maxSize / svg.height);
					svg.scale(scale);
					
					canvas.add(svg);
					canvas.setActiveObject(svg);
					updatePropertiesPanel(svg);
					renderLayers();
					pushHistory();
				});
				
				id('svg-modal').style.display = 'none';
			}

			// === Advanced Shape (Backdrop) ===
			
		click('se-add-advanced-rect', ()=>{ 
			if(!bgCheck()) return; 
			
			const rect = new fabric.Rect({ 
				left: canvas.width/2 - 100, 
				top: canvas.height/2 - 75, 
				width: 200, 
				height: 150, 
				fill: '#ffffff', 
				stroke: '#000000', 
				strokeWidth: 0,
				strokeUniform: true,  // ВАЖНО: Обводка не масштабируется!
				rx: 0,
				ry: 0,
				opacity: 1,
				// Запрещаем масштабирование, разрешаем только resize
				lockScalingFlip: true,  // Запрет отзеркаливания
				name: 'Подложка '+(canvas.getObjects().length+1),
				_advancedShape: true,
				_radiusTL: 0,
				_radiusTR: 0,
				_radiusBL: 0,
				_radiusBR: 0,
				// Сохраняем начальные размеры для пропорционального масштабирования
				_initialWidth: 200,
				_initialHeight: 150,
				_fillType: 'gradient',
				_gradientType: 'linear',
				_gradientColors: ['#74c7ec', '#89b4fa'],
				_gradientOpacities: [1, 1],
				_gradientAngle: 90
			}); 
			
			// ВАЖНО: Добавляем обработчик для пересчёта скругления при изменении размера
			rect.on('scaling', function() {
				// Конвертируем scale в width/height
				const newWidth = this.width * this.scaleX;
				const newHeight = this.height * this.scaleY;
				
				// Масштабируем радиус пропорционально (берём минимальный коэффициент)
				if (this._advancedShape && this._initialWidth && this.rx > 0) {
					const scaleRatio = Math.min(newWidth / this._initialWidth, newHeight / this._initialHeight);
					const baseRadius = this._radiusTL || 0; // Используем TL как базовый
					this.rx = Math.round(baseRadius * scaleRatio);
					this.ry = this.rx;
				}
				
				this.set({
					width: newWidth,
					height: newHeight,
					scaleX: 1,
					scaleY: 1
				});
				
				// Обновляем начальные размеры для следующего масштабирования
				this._initialWidth = newWidth;
				this._initialHeight = newHeight;
				
				// Обновляем UI
				if (canvas.getActiveObject() === this) {
					updateAdvancedShapePanel(this);
				}
			});
			
			canvas.add(rect); 
			canvas.setActiveObject(rect);
			
			// Применяем градиент сразу при создании
			applyGradientToObject(rect);
			
			updatePropertiesPanel(rect); 
			updateAdvancedShapePanel(rect);
			renderLayers(); 
			pushHistory();
		});

		// Selection handlers for advanced panel
			canvas.on('selection:created', (e) => {
				const obj = e.selected && e.selected[0] ? e.selected[0] : null;
				updatePropertiesPanel(obj);
				updateAdvancedShapePanel(obj);
			});

			canvas.on('selection:updated', (e) => {
				const obj = e.selected && e.selected[0] ? e.selected[0] : null;
				updatePropertiesPanel(obj);
				updateAdvancedShapePanel(obj);
			});

			canvas.on('selection:cleared', () => {
				updatePropertiesPanel(null);
				updateAdvancedShapePanel(null);
			});
			
			// Вспомогательная функция для проверки типа подложки
			function isBackdropShape(obj) {
				return obj && obj._advancedShape;
			}
			
			// Corner radius handlers
			['tl', 'tr', 'bl', 'br'].forEach(corner => {
				const elem = id(`se-radius-${corner}`);
				if(elem) elem.addEventListener('input', () => { 
					const obj = canvas.getActiveObject(); 
					if(isBackdropShape(obj)) applyCornerRadius(obj); 
				});
			});

			// Fill type toggles
			id('se-fill-type-solid')?.addEventListener('click', () => {
				const obj = canvas.getActiveObject(); 
				if(!isBackdropShape(obj)) return;
				obj._fillType = 'solid'; 
				obj.set({ fill: id('se-shape-fill-color').value, opacity: parseInt(id('se-shape-fill-opacity').value) / 100 });
				updateAdvancedShapePanel(obj); 
				canvas.renderAll(); 
				pushHistory();
			});

		id('se-fill-type-gradient')?.addEventListener('click', () => {
			const obj = canvas.getActiveObject(); 
			if(!isBackdropShape(obj)) return;
			obj._fillType = 'gradient'; 
			updateAdvancedShapePanel(obj); 
			applyGradient(obj);
		});		// Solid fill handlers
		id('se-shape-fill-color')?.addEventListener('input', (e) => {
			const obj = canvas.getActiveObject();
			if(isBackdropShape(obj) && obj._fillType === 'solid') { 
				obj.set({ fill: e.target.value }); 
				canvas.renderAll(); 
				pushHistory(); 
			}
		});		id('se-shape-fill-opacity')?.addEventListener('input', (e) => {
			const obj = canvas.getActiveObject();
			if(isBackdropShape(obj) && obj._fillType === 'solid') { 
				obj.set({ opacity: parseInt(e.target.value) / 100 }); 
				id('se-shape-fill-opacity-value').textContent = e.target.value + '%'; 
				canvas.renderAll(); 
				pushHistory(); 
			}
		});			// Gradient handlers
			id('se-gradient-type')?.addEventListener('change', () => {
				const obj = canvas.getActiveObject();
				if(isBackdropShape(obj) && obj._fillType === 'gradient') { 
					const angleControl = id('se-gradient-angle-control'); 
					if(angleControl) angleControl.style.display = id('se-gradient-type').value === 'linear' ? 'block' : 'none'; 
					applyGradient(obj); 
				}
			});

			['color1', 'color2'].forEach(c => { 
				id(`se-gradient-${c}`)?.addEventListener('input', () => { 
					const obj = canvas.getActiveObject(); 
					if(isBackdropShape(obj) && obj._fillType === 'gradient') applyGradient(obj); 
				}); 
			});
			
			['opacity1', 'opacity2'].forEach(o => { 
				id(`se-gradient-${o}`)?.addEventListener('input', (e) => { 
					const obj = canvas.getActiveObject(); 
					if(isBackdropShape(obj) && obj._fillType === 'gradient') { 
						id(`se-gradient-${o}-value`).textContent = e.target.value + '%'; 
						applyGradient(obj); 
					} 
				}); 
			});
			
			id('se-gradient-angle')?.addEventListener('input', (e) => { 
				const obj = canvas.getActiveObject(); 
				if(isBackdropShape(obj) && obj._fillType === 'gradient') { 
					id('se-gradient-angle-value').textContent = e.target.value + '°'; 
					applyGradient(obj); 
				} 
			});

			// Stroke handlers
			id('se-shape-stroke-color')?.addEventListener('input', (e) => { 
				const obj = canvas.getActiveObject(); 
				if(isBackdropShape(obj)) { 
					obj.set({ stroke: e.target.value }); 
					canvas.renderAll(); 
					pushHistory(); 
				} 
			});
			
			id('se-shape-stroke-width')?.addEventListener('input', (e) => { 
				const obj = canvas.getActiveObject(); 
				if(isBackdropShape(obj)) { 
					obj.set({ strokeWidth: parseInt(e.target.value) }); 
					id('se-shape-stroke-width-value').textContent = e.target.value; 
					canvas.renderAll(); 
					pushHistory(); 
				} 
			});

			// Shadow handlers
			id('se-shadow-enabled')?.addEventListener('change', (e) => {
				const obj = canvas.getActiveObject(); 
				if(!isBackdropShape(obj)) return;
				if(e.target.checked) { 
					obj.set({ shadow: new fabric.Shadow({ 
						color: id('se-shadow-color').value, 
						offsetX: parseInt(id('se-shadow-offset-x').value), 
						offsetY: parseInt(id('se-shadow-offset-y').value), 
						blur: parseInt(id('se-shadow-blur').value) 
					}) }); 
					const shadowControls = id('se-shadow-controls'); 
					if(shadowControls) shadowControls.style.display = 'block'; 
				} else { 
					obj.set({ shadow: null }); 
					const shadowControls = id('se-shadow-controls'); 
					if(shadowControls) shadowControls.style.display = 'none'; 
				}
				canvas.renderAll(); 
				pushHistory();
			});

			['color', 'offset-x', 'offset-y', 'blur'].forEach(prop => {
				const elem = id(`se-shadow-${prop}`); 
				if(!elem) return;
				elem.addEventListener('input', (e) => {
					const obj = canvas.getActiveObject(); 
					if(!isBackdropShape(obj) || !obj.shadow) return;
					const valElem = id(`se-shadow-${prop}-value`); 
					if(valElem && prop !== 'color') valElem.textContent = e.target.value;
					if(prop === 'color') obj.shadow.color = e.target.value;
					else if(prop === 'offset-x') obj.shadow.offsetX = parseInt(e.target.value);
					else if(prop === 'offset-y') obj.shadow.offsetY = parseInt(e.target.value);
					else if(prop === 'blur') obj.shadow.blur = parseInt(e.target.value);
					canvas.renderAll(); 
					pushHistory();
				});
			});

			function updateAdvancedShapePanel(obj) {
				const panel = id('se-shape-advanced');
				if(!panel) return;

				// Показываем панель только для _advancedShape (Rect)
				if(!obj || !obj._advancedShape) {
					panel.style.display = 'none';
					return;
				}
				
				panel.style.display = 'block';
				
				// Corner radius
				id('se-radius-tl').value = obj._radiusTL || 0;
				id('se-radius-tr').value = obj._radiusTR || 0;
				id('se-radius-bl').value = obj._radiusBL || 0;
				id('se-radius-br').value = obj._radiusBR || 0;
				
				const fillType = obj._fillType || 'solid';
				const solidControls = id('se-fill-solid-controls');
				const gradientControls = id('se-fill-gradient-controls');
				
				if(solidControls) solidControls.style.display = fillType === 'solid' ? 'block' : 'none';
				if(gradientControls) gradientControls.style.display = fillType === 'gradient' ? 'block' : 'none';
				
				if(fillType === 'solid') {
					id('se-shape-fill-color').value = obj.fill || '#ffffff';
					id('se-shape-fill-opacity').value = (obj.opacity || 1) * 100;
					id('se-shape-fill-opacity-value').textContent = Math.round((obj.opacity || 1) * 100) + '%';
				} else {
					id('se-gradient-type').value = obj._gradientType || 'linear';
					id('se-gradient-color1').value = obj._gradientColors[0] || '#74c7ec';
					id('se-gradient-color2').value = obj._gradientColors[1] || '#89b4fa';
					id('se-gradient-opacity1').value = (obj._gradientOpacities[0] || 1) * 100;
					id('se-gradient-opacity2').value = (obj._gradientOpacities[1] || 1) * 100;
					id('se-gradient-opacity1-value').textContent = Math.round((obj._gradientOpacities[0] || 1) * 100) + '%';
					id('se-gradient-opacity2-value').textContent = Math.round((obj._gradientOpacities[1] || 1) * 100) + '%';
					id('se-gradient-angle').value = obj._gradientAngle || 90;
					id('se-gradient-angle-value').textContent = (obj._gradientAngle || 90) + '°';
					
					const angleControl = id('se-gradient-angle-control');
					if(angleControl) angleControl.style.display = obj._gradientType === 'linear' ? 'block' : 'none';
				}
				
				id('se-shape-stroke-color').value = obj.stroke || '#000000';
				id('se-shape-stroke-width').value = obj.strokeWidth || 0;
				id('se-shape-stroke-width-value').textContent = obj.strokeWidth || 0;
				
				const hasShadow = !!(obj.shadow);
				id('se-shadow-enabled').checked = hasShadow;
				const shadowControls = id('se-shadow-controls');
				if(shadowControls) shadowControls.style.display = hasShadow ? 'block' : 'none';
				
				if(hasShadow && obj.shadow) {
					id('se-shadow-color').value = obj.shadow.color || '#000000';
					id('se-shadow-offset-x').value = obj.shadow.offsetX || 5;
					id('se-shadow-offset-y').value = obj.shadow.offsetY || 5;
					id('se-shadow-blur').value = obj.shadow.blur || 10;
					id('se-shadow-offset-x-value').textContent = obj.shadow.offsetX || 5;
					id('se-shadow-offset-y-value').textContent = obj.shadow.offsetY || 5;
					id('se-shadow-blur-value').textContent = obj.shadow.blur || 10;
				}
			}

			function applyCornerRadius(obj) {
				if(!obj) return;
				
				// Для обычного Rect (старая подложка)
				if(obj.type !== 'rect') return;
				
				// Используем только одно значение для всех углов (TL)
				const radius = parseInt(id('se-radius-tl')?.value) || 0;
				
				// Сохраняем значения
				obj._radiusTL = radius; 
				obj._radiusTR = radius; 
				obj._radiusBL = radius; 
				obj._radiusBR = radius;
				
				// Применяем стандартное скругление
				obj.set({ rx: radius, ry: radius });
				
				canvas.renderAll(); 
				pushHistory();
			}

		function applyGradient(obj) {
			if(!obj) return;
			const type = id('se-gradient-type').value;
			const color1 = id('se-gradient-color1').value;
			const color2 = id('se-gradient-color2').value;
			const opacity1 = parseInt(id('se-gradient-opacity1').value) / 100;
			const opacity2 = parseInt(id('se-gradient-opacity2').value) / 100;
			const angle = parseInt(id('se-gradient-angle').value);
			
			// Сохраняем настройки в объект
			obj._gradientType = type; 
			obj._gradientColors = [color1, color2];
			obj._gradientOpacities = [opacity1, opacity2]; 
			obj._gradientAngle = angle;
			
			applyGradientToObject(obj);
		}
		
		function applyGradientToObject(obj) {
			if(!obj || !obj._gradientColors) return;
			
			const type = obj._gradientType || 'linear';
			const color1 = obj._gradientColors[0];
			const color2 = obj._gradientColors[1];
			const opacity1 = obj._gradientOpacities[0];
			const opacity2 = obj._gradientOpacities[1];
			const angle = obj._gradientAngle || 90;
			
			const hexToRgba = (hex, alpha) => {
				const r = parseInt(hex.slice(1, 3), 16);
				const g = parseInt(hex.slice(3, 5), 16);
				const b = parseInt(hex.slice(5, 7), 16);
				return `rgba(${r}, ${g}, ${b}, ${alpha})`;
			};
			
			let gradient;
			if(type === 'linear') {
				const angleRad = (angle - 90) * Math.PI / 180;
				const x1 = obj.width / 2 - (Math.cos(angleRad) * obj.width / 2);
				const y1 = obj.height / 2 - (Math.sin(angleRad) * obj.height / 2);
				const x2 = obj.width / 2 + (Math.cos(angleRad) * obj.width / 2);
				const y2 = obj.height / 2 + (Math.sin(angleRad) * obj.height / 2);
				gradient = new fabric.Gradient({
					type: 'linear', 
					coords: { x1, y1, x2, y2 },
					colorStops: [
						{offset: 0, color: hexToRgba(color1, opacity1)}, 
						{offset: 1, color: hexToRgba(color2, opacity2)}
					]
				});
			} else {
				gradient = new fabric.Gradient({
					type: 'radial', 
					coords: { 
						x1: obj.width / 2, 
						y1: obj.height / 2, 
						x2: obj.width / 2, 
						y2: obj.height / 2, 
						r1: 0, 
						r2: Math.max(obj.width, obj.height) / 2 
					},
					colorStops: [
						{offset: 0, color: hexToRgba(color1, opacity1)}, 
						{offset: 1, color: hexToRgba(color2, opacity2)}
					]
				});
			}
			
			obj.set({ fill: gradient, opacity: 1 });
			canvas.renderAll(); 
			pushHistory();
		}		// === GROUPING & UNGROUPING ===
		function groupSelectedObjects() {
			const activeObject = canvas.getActiveObject();
			if (!activeObject) return;

			if (activeObject.type === 'activeSelection') {
				// Преобразуем активное выделение в группу
				activeObject.toGroup();
				canvas.requestRenderAll();
				pushHistory();
				renderLayers();
			}
		}

		function ungroupSelectedObject() {
			const activeObject = canvas.getActiveObject();
			if (!activeObject) return;

			if (activeObject.type === 'group') {
				// Разгруппировать группу в активное выделение
				activeObject.toActiveSelection();
				canvas.requestRenderAll();
				pushHistory();
				renderLayers();
			}
		}

		// === CONTEXT MENU ===
		const contextMenu = document.getElementById('context-menu');
		let contextMenuTarget = null;

	// Показать контекстное меню
	function showContextMenu(e, target) {
		e.preventDefault();
		
		console.log('🎯 Context menu triggered:', target ? target.type : 'no target');
		
		if (!contextMenu) {
			console.error('❌ Context menu element not found!');
			return;
		}
		
		contextMenuTarget = target;
		
		// Позиция меню
		const x = e.clientX;
		const y = e.clientY;
		
		console.log('📍 Menu position:', x, y);
		
		// Проверка границ экрана
		contextMenu.style.left = x + 'px';
		contextMenu.style.top = y + 'px';
		contextMenu.style.display = 'block'; // Добавлено для гарантии
		contextMenu.classList.add('show');
		
		console.log('✅ Menu should be visible now');
		
		// Обновляем состояние кнопок
		updateContextMenuState(target);			// Корректируем позицию если меню выходит за границы
			setTimeout(() => {
				const rect = contextMenu.getBoundingClientRect();
				if (rect.right > window.innerWidth) {
					contextMenu.style.left = (x - rect.width) + 'px';
				}
				if (rect.bottom > window.innerHeight) {
					contextMenu.style.top = (y - rect.height) + 'px';
				}
			}, 0);
		}

		// Обновить состояние элементов меню
		function updateContextMenuState(target) {
			const groupBtn = contextMenu.querySelector('[data-action="group"]');
			const ungroupBtn = contextMenu.querySelector('[data-action="ungroup"]');
			const lockBtn = contextMenu.querySelector('[data-action="lock"]');
			
			// Группировка доступна только для множественного выделения
			if (target && target.type === 'activeSelection') {
				groupBtn.classList.remove('disabled');
				ungroupBtn.classList.add('disabled');
			} else if (target && target.type === 'group') {
				groupBtn.classList.add('disabled');
				ungroupBtn.classList.remove('disabled');
			} else {
				groupBtn.classList.add('disabled');
				ungroupBtn.classList.add('disabled');
			}
			
			// Обновляем текст блокировки
			if (target && target.lockMovementX) {
				lockBtn.innerHTML = '<i class="fas fa-unlock"></i><span>Разблокировать</span>';
			} else {
				lockBtn.innerHTML = '<i class="fas fa-lock"></i><span>Заблокировать</span>';
			}
		}

		// Скрыть контекстное меню
		function hideContextMenu() {
			contextMenu.classList.remove('show');
		contextMenuTarget = null;
	}

	// Обработчик правого клика на canvas (единый метод)
	canvas.wrapperEl.addEventListener('contextmenu', function(e) {
		e.preventDefault();
		e.stopPropagation();
		
		// Получаем координаты клика относительно canvas
		const rect = canvas.upperCanvasEl.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		
		// Преобразуем в координаты canvas с учётом zoom
		const pointer = canvas.getPointer(e);
		const target = canvas.findTarget(e, false);
		
		console.log('🎯 Right click detected:', { target: target?.type, x, y });
		
		if (target && target !== backgroundImage) {
			// Выделяем объект
			canvas.setActiveObject(target);
			canvas.requestRenderAll();
			
			// Показываем меню
			showContextMenu(e, target);
		} else {
			// Клик по пустому месту - разрешаем стандартное меню
			console.log('⚪ Click on empty area');
			return true;
		}
		
		return false;
	});

	// Закрытие меню при клике вне его (только левый клик)
	document.addEventListener('click', function(e) {
		// Игнорируем правый клик
		if (e.button !== 0) return;
		
		if (!contextMenu.contains(e.target)) {
			hideContextMenu();
		}
	});
	
	// Закрытие меню при нажатии Escape
	document.addEventListener('keydown', function(e) {
		if (e.key === 'Escape') {
			hideContextMenu();
		}
	});

		// Обработчики действий контекстного меню
		contextMenu.addEventListener('click', function(e) {
			const item = e.target.closest('.context-menu-item');
			if (!item || item.classList.contains('disabled')) return;
			
			const action = item.dataset.action;
			const obj = contextMenuTarget || canvas.getActiveObject();
			
			if (!obj) {
				hideContextMenu();
				return;
			}
			
			switch(action) {
				case 'group':
					groupSelectedObjects();
					break;
					
				case 'ungroup':
					ungroupSelectedObject();
					break;
					
				case 'bring-front':
					obj.bringToFront();
					canvas.requestRenderAll();
					pushHistory();
					renderLayers();
					break;
					
				case 'bring-forward':
					obj.bringForward();
					canvas.requestRenderAll();
					pushHistory();
					renderLayers();
					break;
					
				case 'send-backward':
					obj.sendBackwards();
					canvas.requestRenderAll();
					pushHistory();
					renderLayers();
					break;
					
				case 'send-back':
					obj.sendToBack();
					canvas.requestRenderAll();
					pushHistory();
					renderLayers();
					break;
					
				case 'duplicate':
					obj.clone(function(cloned) {
						cloned.set({
							left: cloned.left + 20,
							top: cloned.top + 20,
							name: obj.name + ' (копия)'
						});
						canvas.add(cloned);
						canvas.setActiveObject(cloned);
						canvas.requestRenderAll();
						pushHistory();
						renderLayers();
					}, ['name', 'selectable', 'evented', 'lockMovementX', 'lockMovementY']);
					break;
					
				case 'lock':
					const isLocked = obj.lockMovementX;
					obj.set({
						lockMovementX: !isLocked,
						lockMovementY: !isLocked,
						selectable: isLocked,
						evented: isLocked
					});
					canvas.requestRenderAll();
					pushHistory();
					break;
					
				case 'hide':
					obj.set('visible', false);
					canvas.discardActiveObject();
					canvas.requestRenderAll();
					pushHistory();
					renderLayers();
					break;
					
				case 'delete':
					canvas.remove(obj);
					canvas.discardActiveObject();
					canvas.requestRenderAll();
					pushHistory();
					renderLayers();
					break;
			}
			
			hideContextMenu();
		});

		// Горячие клавиши для группировки
		document.addEventListener('keydown', function(e) {
			// Ctrl/Cmd + G - группировать
			if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
				e.preventDefault();
			groupSelectedObjects();
		}
		
		// Ctrl/Cmd + Shift + G - разгруппировать
		if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
			e.preventDefault();
			ungroupSelectedObject();
		}
	});

	// === Batch Processing ===
	let batchFiles = [];
	let batchResults = [];
	
	const batchModal = id('batch-modal');
	const batchModalClose = id('batch-modal-close');
	const batchSelectFiles = id('batch-select-files');
	const batchFileInput = id('batch-file-input');
	const batchFilesList = id('batch-files-list');
	const batchFilesContainer = id('batch-files-container');
	const batchFileCount = id('batch-file-count');
	const batchProgress = id('batch-progress');
	const batchProgressBar = id('batch-progress-bar');
	const batchProgressText = id('batch-progress-text');
	const batchActions = id('batch-actions');
	const batchDownloadZip = id('batch-download-zip');
	
	// Open batch modal
	click('se-batch-process', () => {
		if(!backgroundImage) {
			alert('Сначала загрузите фоновое изображение и создайте макет');
			return;
		}
		batchFiles = [];
		batchResults = [];
		batchFilesList.style.display = 'none';
		batchProgress.style.display = 'none';
		batchActions.style.display = 'none';
		batchModal.style.display = 'flex';
	});
	
	// Close modal
	batchModalClose?.addEventListener('click', () => {
		batchModal.style.display = 'none';
	});
	
	// Close on outside click
	batchModal?.addEventListener('click', (e) => {
		if(e.target === batchModal) {
			batchModal.style.display = 'none';
		}
	});
	
	// Select files button
	batchSelectFiles?.addEventListener('click', () => {
		batchFileInput.click();
	});
	
	// Handle file selection
	batchFileInput?.addEventListener('change', (e) => {
		const files = Array.from(e.target.files);
		if(files.length === 0) return;
		
		batchFiles = files;
		batchFileCount.textContent = files.length;
		batchFilesContainer.innerHTML = files.map((f, i) => 
			`<div style="padding: 5px 10px; background: #f5f5f5; border-radius: 5px; font-size: 13px;">
				<i class="fas fa-image" style="color: #667eea;"></i> ${f.name}
			</div>`
		).join('');
		batchFilesList.style.display = 'block';
		
		// Start processing automatically
		setTimeout(() => processBatchFiles(), 500);
	});
	
	// Process all files
	async function processBatchFiles() {
		batchResults = [];
		batchProgress.style.display = 'block';
		batchProgressBar.style.width = '0%';
		
		// Save current canvas state (all objects except background)
		const templateObjects = canvas.getObjects().filter(obj => obj !== backgroundImage);
		const templateJSON = JSON.stringify(templateObjects);
		
		for(let i = 0; i < batchFiles.length; i++) {
			const file = batchFiles[i];
			batchProgressText.textContent = `${i + 1} / ${batchFiles.length}`;
			batchProgressBar.style.width = `${((i + 1) / batchFiles.length) * 100}%`;
			
			await processOneFile(file, templateJSON);
		}
		
		batchActions.style.display = 'flex';
	}
	
	// Process single file
	function processOneFile(file, templateJSON) {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onload = function(e) {
				fabric.Image.fromURL(e.target.result, function(img) {
					// Clear canvas
					canvas.clear();
					
					// Set new background
					const imgWidth = img.width;
					const imgHeight = img.height;
					canvas.setWidth(imgWidth);
					canvas.setHeight(imgHeight);
					canvas.calcOffset();
					
					img.set({
						selectable: false,
						evented: false,
						name: 'Фоновое изображение'
					});
					canvas.setBackgroundImage(img, () => {
						// Restore template objects
						const objects = JSON.parse(templateJSON);
						fabric.util.enlivenObjects(objects, (enlivenedObjects) => {
							enlivenedObjects.forEach(obj => {
								canvas.add(obj);
							});
							canvas.renderAll();
							
							// Export to PNG
							const dataURL = canvas.toDataURL({
								format: 'png',
								quality: 1,
								multiplier: 1
							});
							
							batchResults.push({
								filename: file.name.replace(/\.[^.]+$/, '.png'),
								data: dataURL
							});
							
							resolve();
						});
					});
				});
			};
			reader.readAsDataURL(file);
		});
	}
	
	// Download as ZIP
	batchDownloadZip?.addEventListener('click', async () => {
		if(!window.JSZip) {
			alert('JSZip library not loaded');
			return;
		}
		
		const zip = new JSZip();
		
		batchResults.forEach(result => {
			// Remove data:image/png;base64, prefix
			const base64Data = result.data.split(',')[1];
			zip.file(result.filename, base64Data, {base64: true});
		});
		
		const blob = await zip.generateAsync({type: 'blob'});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `avito-batch-${Date.now()}.zip`;
		a.click();
		URL.revokeObjectURL(url);
		
		// Close modal after download
		setTimeout(() => {
			batchModal.style.display = 'none';
			alert(`Успешно обработано и скачано ${batchResults.length} файлов`);
		}, 500);
	});

	// === Load template from URL parameter ===
	// УСТАРЕЛО: Теперь загрузка через app.js → loadTemplateFromDB() из MySQL
	/*
	async function loadTemplateFromURL() {
		const urlParams = new URLSearchParams(window.location.search);
		const templateId = urlParams.get('template');
		
		if (!templateId) return;
		
		try {
			// Load templates.json
			const response = await fetch('data/templates.json');
			const data = await response.json();
			
			const template = data.templates.find(t => t.id === templateId);
			
			if (!template) {
				console.error('Template not found:', templateId);
				alert('Шаблон не найден');
				return;
			}
			
			console.log('Loading template:', template.title);
			
			// Check if template has data
			if (template.data && template.data.objects) {
				// Load from Fabric.js JSON
				isProjectLoading = true;
				canvas.loadFromJSON(template.data, function() {
					// Restore gradients after loading
					restoreGradients();
					
					// Restore background image if exists
					if (template.data.backgroundImage) {
						loadBackgroundFromJSON(template.data.backgroundImage);
					}
					
					canvas.renderAll();
					isProjectLoading = false;
					saveToHistory();
					
					console.log('✅ Template loaded successfully');
					
					// Show notification
					setTimeout(() => {
						alert(`Шаблон "${template.title}" загружен!\n\nТеперь вы можете редактировать и экспортировать изображение.`);
					}, 500);
				});
			} else {
				// No template data, just show info
				alert(`Шаблон "${template.title}" пока не содержит данных для загрузки.\n\nВы можете создать дизайн и сохранить его в админ-панели.`);
			}
			
		} catch (error) {
			console.error('Error loading template:', error);
			alert('Ошибка загрузки шаблона');
		}
	}
	*/
	
	// Load background from JSON data
	function loadBackgroundFromJSON(bgData) {
		if (!bgData || !bgData.src) return;
		
		fabric.Image.fromURL(bgData.src, function(img) {
			if (!img) return;
			
			img.set({
				selectable: false,
				evented: false,
				name: 'background'
			});
			
			// Scale to fit canvas
			const scaleX = canvas.width / img.width;
			const scaleY = canvas.height / img.height;
			const scale = Math.max(scaleX, scaleY);
			
			img.scale(scale);
			img.center();
			
			backgroundImage = img;
			canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
		});
	}
	
	// === Загрузка шаблонов из MySQL ===
	
	// Helper: Fix crossOrigin for all images in canvas (with Promise)
	function fixCrossOriginForImages(canvas) {
		return new Promise((resolve) => {
			console.log('[Fix CORS] Fixing crossOrigin for all image objects...');
			
			const objects = canvas.getObjects();
			const imagesToFix = [];
			
			// Collect all images that need fixing
			objects.forEach((obj, index) => {
				if (obj.type === 'image' && obj._element) {
					const imgSrc = obj.getSrc();
					
					if (imgSrc && !obj._element.crossOrigin) {
						imagesToFix.push({ obj, index, imgSrc });
					}
				}
			});
			
			if (imagesToFix.length === 0) {
				console.log('[Fix CORS] No images needed fixing');
				resolve();
				return;
			}
			
			console.log(`[Fix CORS] Found ${imagesToFix.length} images to fix`);
			
			let fixedCount = 0;
			const promises = [];
			
			imagesToFix.forEach(({ obj, index, imgSrc }) => {
				const promise = new Promise((resolveImg) => {
					console.log(`[Fix CORS] Fixing image ${index + 1}: ${imgSrc.substring(0, 50)}...`);
					
					const newImg = new Image();
					newImg.crossOrigin = 'anonymous';
					
					newImg.onload = () => {
						obj.setElement(newImg);
						fixedCount++;
						console.log(`[Fix CORS] Image ${index + 1} fixed (${fixedCount}/${imagesToFix.length})`);
						resolveImg();
					};
					
					newImg.onerror = () => {
						console.warn(`[Fix CORS] Failed to reload image ${index + 1}`);
						resolveImg(); // Still resolve to not block
					};
					
					newImg.src = imgSrc;
				});
				
				promises.push(promise);
			});
			
			// Wait for all images to load
			Promise.all(promises).then(() => {
				canvas.renderAll();
				console.log(`[Fix CORS] Complete! Fixed ${fixedCount}/${imagesToFix.length} images`);
				resolve();
			});
		});
}

let pendingTemplateId = null;

async function checkForTemplateLoad() {
	console.log('[Editor] Checking for template in URL');
	const urlParams = new URLSearchParams(window.location.search);
	const templateId = urlParams.get('template');
	console.log('[Editor] Template ID:', templateId);
	
	if (templateId) {
		// Проверяем, есть ли сохранённая работа
		const saved = localStorage.getItem(AUTOSAVE_KEY);
		
		if (saved) {
			// Есть несохранённая работа - показываем модальное окно
			pendingTemplateId = templateId;
			const modal = document.getElementById('templateLoadModal');
			if (modal) {
				modal.style.display = 'flex';
			}
		} else {
			// Нет сохранённой работы - сразу загружаем шаблон
			await loadTemplateFromDB(templateId);
		}
	}
}

// Глобальные функции для кнопок модального окна
window.confirmTemplateLoad = async function() {
	const modal = document.getElementById('templateLoadModal');
	if (modal) {
		modal.style.display = 'none';
	}
	
	// Удаляем автосохранение
	localStorage.removeItem(AUTOSAVE_KEY);
	console.log('🗑️ Автосохранение удалено по запросу пользователя');
	
	// Загружаем шаблон
	if (pendingTemplateId) {
		await loadTemplateFromDB(pendingTemplateId);
		pendingTemplateId = null;
	}
};

window.cancelTemplateLoad = function() {
	const modal = document.getElementById('templateLoadModal');
	if (modal) {
		modal.style.display = 'none';
	}
	
	// Удаляем ?template=ID из URL без перезагрузки
	const url = new URL(window.location);
	url.searchParams.delete('template');
	window.history.replaceState({}, '', url);
	
	pendingTemplateId = null;
	console.log('❌ Загрузка шаблона отменена, продолжаем работу');
};
	async function loadTemplateFromDB(templateId) {
		try {
			console.log('[Template Load] ID:', templateId);
			const url = `/avitoeditor/api/templates.php?id=${templateId}`;
			console.log('[Template Load] API URL:', url);
			
			const response = await fetch(url, { credentials: 'include' });
			console.log('[Template Load] Response status:', response.status);
			
			const template = await response.json();
			console.log('[Template Load] Data received:', template);
			
			if (template && template.id) {
				const canvasData = template.canvasData;
				console.log('[Template Load] Canvas data:', canvasData);
				console.log('[Template Load] Objects count:', canvasData?.objects?.length || 0);
				
				if (!canvasData) {
					throw new Error('Шаблон не содержит данных canvas');
				}
				
				if (!canvasData.objects || canvasData.objects.length === 0) {
					console.warn('[Template Load] WARNING: Canvas is empty');
				}
				
				// Устанавливаем размеры canvas
				if (canvasData.width && canvasData.height) {
					canvas.setWidth(canvasData.width);
					canvas.setHeight(canvasData.height);
					canvas.calcOffset();
					console.log('[Template Load] Canvas size set:', canvasData.width, 'x', canvasData.height);
				}
				
				// Устанавливаем цвет фона
				if (canvasData.backgroundColor) {
					canvas.backgroundColor = canvasData.backgroundColor;
				}
				
				// Проверяем наличие фонового изображения
				if (canvasData.backgroundImage) {
					console.log('[Template Load] Loading background image...');
					
					// Загружаем фоновое изображение отдельно
					fabric.Image.fromURL(canvasData.backgroundImage.src || canvasData.backgroundImage, function(img) {
						if (img) {
							img.set({
								selectable: false,
								evented: false,
								name: 'Фоновое изображение'
							});
							
							// Устанавливаем как фон canvas (НЕ как объект!)
							canvas.setBackgroundImage(img, () => {
								console.log('[Template Load] Background image set');
								
								// Теперь загружаем объекты поверх фона
								canvas.loadFromJSON(canvasData, async () => {
									// Fix crossOrigin for all image objects
									await fixCrossOriginForImages(canvas);
							restoreGradients();
									
									canvas.renderAll();
									fitToView();
									renderLayers();
									console.log('[Template Load] SUCCESS: Template loaded with background');
									console.log('[Template Load] Objects on canvas:', canvas.getObjects().length);
								});
							});
						} else {
							console.warn('[Template Load] Background image failed to load, loading objects only');
							loadObjectsOnly();
						}
					}, { crossOrigin: 'anonymous' });
				} else {
					// Нет фонового изображения - загружаем только объекты
					console.log('[Template Load] No background image, loading objects only');
					loadObjectsOnly();
				}
				
			function loadObjectsOnly() {
				canvas.loadFromJSON(canvasData, async () => {
					// Fix crossOrigin for all image objects
					await fixCrossOriginForImages(canvas);
							restoreGradients();
					
					canvas.renderAll();
					fitToView();
					renderLayers();
					console.log('[Template Load] SUCCESS: Template loaded');
					console.log('[Template Load] Objects on canvas:', canvas.getObjects().length);
				});
			}			} else {
				console.error('[Template Load] ERROR: Template not found');
				alert('Шаблон не найден в базе данных');
			}
		} catch (error) {
			console.error('[Template Load] ERROR:', error);
			alert('Ошибка загрузки шаблона: ' + error.message);
		}
	}
	
	// Проверяем URL при загрузке страницы
	setTimeout(() => {
		checkForTemplateLoad();
	}, 1000);

	// === Admin Mode ===
	let isAdminMode = false;
	checkAdminStatus();

	// Admin login button
	const adminLoginBtn = document.getElementById('admin-login-btn');
	if(adminLoginBtn) {
		adminLoginBtn.addEventListener('click', async function() {
			const redirect = encodeURIComponent(window.location.pathname + window.location.search);
			try {
				const response = await fetch('api/auth.php', {
					credentials: 'include'
				});
				const data = await response.json();
				if (data.is_admin) {
					isAdminMode = true;
					showAdminUI();
					alert('✅ Режим администратора уже активирован');
					return;
				}
			} catch (error) {
				console.error('Ошибка проверки админа:', error);
			}

			alert('Для входа в режим администратора сначала войдите через админ-панель.');
			window.location.href = 'admin.html?redirect=' + redirect;
		});
	}

	// Admin logout button
	const adminLogoutBtn = document.getElementById('admin-logout-btn');
	if(adminLogoutBtn) {
		adminLogoutBtn.addEventListener('click', async function() {
			if(confirm('Выйти из режима администратора?')) {
				try {
					await fetch('api/auth.php', {
						method: 'DELETE',
						credentials: 'include'
					});
				} catch (error) {
					console.error('Ошибка выхода из админ-режима:', error);
				}

				isAdminMode = false;
				hideAdminUI();
				alert('Вы вышли из режима администратора');
			}
		});
	}

	async function checkAdminStatus() {
		try {
			const response = await fetch('api/auth.php', {
				credentials: 'include'
			});
			if (!response.ok) {
				hideAdminUI();
				return;
			}

			const data = await response.json();
			isAdminMode = !!data.is_admin;
			if (isAdminMode) {
				showAdminUI();
				return;
			}
		} catch (error) {
			console.error('Ошибка проверки админ-режима:', error);
		}

		hideAdminUI();
	}

	function showAdminUI() {
		const saveTemplateBtn = document.getElementById('se-save-template');
		const loginBtn = document.getElementById('admin-login-btn');
		const logoutBtn = document.getElementById('admin-logout-btn');
		
		if(saveTemplateBtn) saveTemplateBtn.style.display = 'flex';
		if(loginBtn) loginBtn.style.display = 'none';
		if(logoutBtn) logoutBtn.style.display = 'flex';
	}

	function hideAdminUI() {
		const saveTemplateBtn = document.getElementById('se-save-template');
		const loginBtn = document.getElementById('admin-login-btn');
		const logoutBtn = document.getElementById('admin-logout-btn');
		
		if(saveTemplateBtn) saveTemplateBtn.style.display = 'none';
		if(loginBtn) loginBtn.style.display = 'flex';
		if(logoutBtn) logoutBtn.style.display = 'none';
	}

	// === Share functionality ===
	function generateShareLink(templateId) {
		const baseUrl = window.location.origin + window.location.pathname;
		return `${baseUrl.replace(/\/[^/]*$/, '/editor.html')}?template=${templateId}`;
	}

	function copyShareLink(templateId) {
		const link = generateShareLink(templateId);
		
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(link)
				.then(() => {
					showNotification('✓ Ссылка скопирована в буфер обмена', 'success');
				})
				.catch(err => {
					console.error('Clipboard error:', err);
					fallbackCopyToClipboard(link);
				});
		} else {
			fallbackCopyToClipboard(link);
		}
	}

	function fallbackCopyToClipboard(text) {
		const textArea = document.createElement('textarea');
		textArea.value = text;
		textArea.style.position = 'fixed';
		textArea.style.left = '-9999px';
		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();
		
		try {
			const successful = document.execCommand('copy');
			if (successful) {
				showNotification('✓ Ссылка скопирована в буфер обмена', 'success');
			} else {
				showNotification('✗ Не удалось скопировать ссылку', 'error');
			}
		} catch (err) {
			console.error('Fallback copy error:', err);
			showNotification('✗ Не удалось скопировать ссылку', 'error');
		}
		
		document.body.removeChild(textArea);
	}

	function shareToTelegram(templateId, templateTitle) {
		const link = generateShareLink(templateId);
		const text = `Шаблон для Avito: ${templateTitle}`;
		const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
		
		window.open(telegramUrl, '_blank', 'width=600,height=400');
	}

	function showNotification(message, type = 'info') {
		const notification = document.createElement('div');
		notification.className = `share-notification notification-${type}`;
		notification.textContent = message;
		
		notification.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			padding: 16px 24px;
			background: ${type === 'success' ? '#a6e3a1' : type === 'error' ? '#f38ba8' : '#89b4fa'};
			color: #1e1e2e;
			border-radius: 12px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.3);
			font-weight: 600;
			z-index: 10000;
			animation: slideInRight 0.3s ease-out;
		`;
		
		document.body.appendChild(notification);
		
		setTimeout(() => {
			notification.style.animation = 'slideOutRight 0.3s ease-in';
			setTimeout(() => notification.remove(), 300);
		}, 3000);
	}

	// Add animation styles
	const style = document.createElement('style');
	style.textContent = `
		@keyframes slideInRight {
			from { transform: translateX(400px); opacity: 0; }
			to { transform: translateX(0); opacity: 1; }
		}
		@keyframes slideOutRight {
			from { transform: translateX(0); opacity: 1; }
			to { transform: translateX(400px); opacity: 0; }
		}
	`;
	document.head.appendChild(style);

	// Export share functions to global scope
	window.copyShareLink = copyShareLink;
	window.shareToTelegram = shareToTelegram;

	// TEST VERSION: Auto-fit canvas on load and on window resize
	setTimeout(() => {
		fitToView();
	}, 100);
	
	// Адаптивное масштабирование при изменении размера окна
	let resizeTimeout;
	window.addEventListener('resize', () => {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			fitToView();
		}, 150);
	});

	});
})();








