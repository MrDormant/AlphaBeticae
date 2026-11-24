// Прописные формы букв (как в книге), не печатный шрифт.
// Строчная «a» — кольцо (пустой круг) + палочка справа, одна высота с линейки до baseline.
const PropisGlyphs = {
  has(ch) {
    return ch === 'a';
  },

  /** Геометрия «a» между линией x-height (xTop) и baseline. x — левый край буквы. */
  metrics(ch, xTop, baseline, x = 0) {
    const h = baseline - xTop;
    const stroke = Math.max(5.5, h * 0.2);
    const r = h / 2 - stroke / 2;
    const cy = xTop + h / 2;
    const stemX = x + 2 * r + stroke * 0.72;
    const cx = stemX - r - stroke + 4;
    const width = stemX - x + stroke * 0.9;
    return { cx, cy, r, stroke, stemX, xTop, baseline, width };
  },

  width(ch, xTop, baseline) {
    return this.metrics(ch, xTop, baseline, 0).width;
  },

  draw(ctx, ch, x, baseline, size, fill, xTop) {
    if (ch !== 'a') return;
    const top = xTop ?? baseline - size * 0.55;
    const m = this.metrics('a', top, baseline, x);

    ctx.save();
    ctx.strokeStyle = fill;
    ctx.lineWidth = m.stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.arc(m.cx, m.cy, m.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(m.stemX, m.xTop);
    ctx.lineTo(m.stemX, m.baseline);
    ctx.stroke();
    ctx.restore();
  },

  printHtml(ch, vowel) {
    if (ch !== 'a') return ch;
    const stroke = vowel ? '#f6c7c5' : '#d6dde2';
    return `<span class="propis-glyph" aria-label="a"><svg viewBox="0 0 48 72" height="54" role="img"><title>a</title>`
      + `<circle cx="10.5" cy="40" r="14" fill="none" stroke="${stroke}" stroke-width="7.5" stroke-linecap="round"/>`
      + `<line x1="28" y1="24" x2="28" y2="56" stroke="${stroke}" stroke-width="7.5" stroke-linecap="round"/>`
      + `</svg></span>`;
  },
};
