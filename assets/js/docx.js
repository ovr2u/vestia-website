/* Vestia Mediation: turns the pre-mediation form into a branded Word document (.docx) in the visitor's
   browser. Nothing is uploaded anywhere: the file is built on the visitor's own device and downloaded.
   A .docx is a ZIP of XML files, so this script writes the XML and packs it with a small ZIP writer.
   Used by site.js as window.VestiaDocx.download(answers, { name, logoUrl }). */
(function () {
  'use strict';

  var INK = '3A3A3A', MUTED = '655E55', BEIGE = 'D9C7B3', LINE = 'E6DDD1', TINT = 'F4EADD';
  var FONT = 'Trebuchet MS';
  var PAGE_TEXT_WIDTH = 9638; // A4 width minus 2 cm margins, in twentieths of a point
  var LEGAL = 'Vestia Mediation is a trading name of Concibrium Limited, a company registered in England and Wales ' +
    '(Company No. 16043891). Registered office: Gw 522, 5th Floor, The Grange, 100 High Street, London, N14 6BN.';

  /* ---------- XML helpers ---------- */
  function esc(s) {
    return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function run(text, props) {
    return '<w:r>' + (props ? '<w:rPr>' + props + '</w:rPr>' : '') +
      '<w:t xml:space="preserve">' + esc(text) + '</w:t></w:r>';
  }
  function para(style, content, extra) {
    return '<w:p><w:pPr><w:pStyle w:val="' + style + '"/>' + (extra || '') + '</w:pPr>' + (content || '') + '</w:p>';
  }
  function textParas(style, value) {
    if (!value) return para(style, run('(not given)', '<w:i/><w:color w:val="' + MUTED + '"/>'));
    return value.split(/\r?\n/).map(function (line) { return para(style, line ? run(line) : ''); }).join('');
  }
  function cell(width, content) {
    return '<w:tc><w:tcPr><w:tcW w:w="' + width + '" w:type="dxa"/></w:tcPr>' + content + '</w:tc>';
  }
  function table(rows) {
    var labelW = 3500, valueW = PAGE_TEXT_WIDTH - labelW;
    var border = 'w:val="single" w:sz="4" w:space="0" w:color="' + LINE + '"';
    return '<w:tbl><w:tblPr><w:tblW w:w="' + PAGE_TEXT_WIDTH + '" w:type="dxa"/>' +
      '<w:tblBorders><w:top ' + border + '/><w:bottom ' + border + '/><w:insideH ' + border + '/></w:tblBorders>' +
      '<w:tblLayout w:type="fixed"/>' +
      '<w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar>' +
      '</w:tblPr><w:tblGrid><w:gridCol w:w="' + labelW + '"/><w:gridCol w:w="' + valueW + '"/></w:tblGrid>' +
      rows.map(function (a) {
        return '<w:tr><w:trPr><w:cantSplit/></w:trPr>' +
          cell(labelW, para('FieldLabel', run(a.label))) +
          cell(valueW, textParas('FieldValue', a.value)) + '</w:tr>';
      }).join('') + '</w:tbl>' + para('Spacer');
  }
  function image(rid, cx, cy) {
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">' +
      '<wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:docPr id="1" name="Vestia Mediation logo" descr="Vestia Mediation"/>' +
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>' +
      '<pic:nvPicPr><pic:cNvPr id="1" name="vestia-logo.png"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>' +
      '</wp:inline></w:drawing></w:r>';
  }

  /* ---------- Document parts ---------- */
  var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

  function documentXml(answers, opts, logo) {
    var body = [];
    if (logo) body.push(para('Logo', image('rIdLogo', logo.cx, logo.cy)));
    body.push(para('Title', run('Pre-mediation information form')));
    body.push(para('Confidential', run('CONFIDENTIAL TO THE MEDIATOR. WITHOUT PREJUDICE.')));
    var confirmed = answers.some(function (a) { return a.section === 'Confirmation' && a.value === 'Yes'; });
    body.push(para('Intro', run('Completed by ' + opts.name + ' on ' + opts.dateText +
      (confirmed ? ', who confirmed that it is given to the mediator in confidence and on a without prejudice basis, ' +
        'under the terms of the Mediation Agreement.' : '.'))));

    var section = null, rows = [];
    function flush() { if (rows.length) { body.push(table(rows)); rows = []; } }
    answers.forEach(function (a) {
      if (a.section === 'Confirmation') return;
      a = { section: a.section, label: a.question || a.label, value: a.value, long: a.long };
      if (a.section !== section) {
        flush();
        section = a.section;
        if (section) body.push(para('Heading1', run(section)));
      }
      if (a.long) {
        flush();
        body.push(para('QuestionLabel', run(a.label)));
        body.push(textParas('Answer', a.value));
      } else {
        rows.push(a);
      }
    });
    flush();

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document ' + NS + ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
      'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>' + body.join('') +
      '<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/>' +
      '<w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/>' +
      '</w:sectPr></w:body></w:document>';
  }

  function footerXml() {
    var small = '<w:color w:val="' + MUTED + '"/><w:sz w:val="16"/>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ' + NS + '>' +
      '<w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr>' +
      run('Confidential to the mediator. Without prejudice.    Page ', small) +
      '<w:fldSimple w:instr=" PAGE ">' + run('1', small) + '</w:fldSimple>' +
      run(' of ', small) + '<w:fldSimple w:instr=" NUMPAGES ">' + run('1', small) + '</w:fldSimple></w:p>' +
      para('Footer', run(LEGAL, small)) + '</w:ftr>';
  }

  function stylesXml() {
    function pStyle(id, name, pPr, rPr, extra) {
      return '<w:style w:type="paragraph" w:customStyle="1" w:styleId="' + id + '"><w:name w:val="' + name + '"/>' +
        '<w:basedOn w:val="Normal"/>' + (extra || '') + '<w:qFormat/>' +
        (pPr ? '<w:pPr>' + pPr + '</w:pPr>' : '') + (rPr ? '<w:rPr>' + rPr + '</w:rPr>' : '') + '</w:style>';
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="' + FONT + '" w:hAnsi="' + FONT + '" w:eastAsia="' + FONT + '" w:cs="' + FONT + '"/>' +
      '<w:color w:val="' + INK + '"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>' +
      '<w:pPr><w:spacing w:before="120" w:after="160"/></w:pPr><w:rPr><w:spacing w:val="10"/><w:sz w:val="44"/><w:szCs w:val="44"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>' +
      '<w:pPr><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="' + BEIGE + '"/></w:pBdr>' +
      '<w:spacing w:before="360" w:after="160"/><w:outlineLvl w:val="0"/></w:pPr>' +
      '<w:rPr><w:spacing w:val="10"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/>' +
      '<w:pPr><w:spacing w:after="40"/><w:jc w:val="center"/></w:pPr><w:rPr><w:color w:val="' + MUTED + '"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:style>' +
      pStyle('Logo', 'Vestia logo', '<w:spacing w:after="240"/>') +
      pStyle('Confidential', 'Confidential banner',
        '<w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="' + INK + '"/></w:pBdr>' +
        '<w:shd w:val="clear" w:color="auto" w:fill="' + TINT + '"/><w:spacing w:before="120" w:after="120"/><w:ind w:left="170"/>',
        '<w:b/><w:bCs/><w:spacing w:val="20"/><w:sz w:val="20"/><w:szCs w:val="20"/>') +
      pStyle('Intro', 'Introduction', '<w:spacing w:after="200"/>', '<w:color w:val="' + MUTED + '"/><w:sz w:val="19"/><w:szCs w:val="19"/>') +
      pStyle('FieldLabel', 'Field label', '<w:spacing w:after="0"/>', '<w:b/><w:bCs/><w:color w:val="' + MUTED + '"/><w:sz w:val="18"/><w:szCs w:val="18"/>') +
      pStyle('FieldValue', 'Field value', '<w:spacing w:after="0"/>') +
      pStyle('QuestionLabel', 'Question', '<w:keepNext/><w:spacing w:before="200" w:after="60"/>',
        '<w:b/><w:bCs/><w:color w:val="' + MUTED + '"/><w:sz w:val="18"/><w:szCs w:val="18"/>') +
      pStyle('Answer', 'Answer', '<w:spacing w:after="60"/>') +
      pStyle('Spacer', 'Spacer', '<w:spacing w:after="0" w:line="120" w:lineRule="exact"/>') +
      '</w:styles>';
  }

  function contentTypes(hasLogo) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      (hasLogo ? '<Default Extension="png" ContentType="image/png"/>' : '') +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '</Types>';
  }

  function rels(items) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      items.map(function (r) { return '<Relationship Id="' + r[0] + '" Type="' + r[1] + '" Target="' + r[2] + '"/>'; }).join('') +
      '</Relationships>';
  }

  function coreXml(opts) {
    var now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:title>Pre-mediation information form (' + esc(opts.name) + ')</dc:title>' +
      '<dc:creator>' + esc(opts.name) + '</dc:creator>' +
      '<dc:description>Confidential to the mediator. Without prejudice.</dc:description>' +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created>' +
      '<dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified>' +
      '</cp:coreProperties>';
  }

  /* ---------- Minimal ZIP writer (stored, no compression) ---------- */
  var CRC_TABLE = (function () {
    var t = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function zip(files) {
    var enc = new TextEncoder();
    var now = new Date();
    var dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    var dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    var chunks = [], central = [], offset = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name);
      var data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      var crc = crc32(data);
      var local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0, true);
      local.setUint16(8, 0, true); local.setUint16(10, dosTime, true); local.setUint16(12, dosDate, true);
      local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
      local.setUint16(26, name.length, true); local.setUint16(28, 0, true);
      chunks.push(new Uint8Array(local.buffer), name, data);
      var cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true);
      cen.setUint16(8, 0, true); cen.setUint16(10, 0, true); cen.setUint16(12, dosTime, true); cen.setUint16(14, dosDate, true);
      cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true);
      cen.setUint16(28, name.length, true); cen.setUint32(42, offset, true);
      central.push(new Uint8Array(cen.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var size = central.reduce(function (n, c) { return n + c.length; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, size, true); end.setUint32(16, offset, true);
    return new Blob(chunks.concat(central, [new Uint8Array(end.buffer)]),
      { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  /* ---------- Public API ---------- */
  function fetchLogo(url) {
    if (!url || !window.fetch) return Promise.resolve(null);
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(); return r.arrayBuffer(); })
      .then(function (buf) {
        var bytes = new Uint8Array(buf);
        if (bytes[0] !== 0x89 || bytes[1] !== 0x50) return null; // PNG only
        var view = new DataView(buf);
        var w = view.getUint32(16), h = view.getUint32(20);
        var cx = 1737360; // 1.9 inches wide, in EMU
        return { bytes: bytes, cx: cx, cy: Math.round(cx * h / w) };
      })
      .catch(function () { return null; });
  }

  function build(answers, opts) {
    opts.dateText = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    return fetchLogo(opts.logoUrl).then(function (logo) {
      var R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
      var docRels = [['rIdStyles', R + 'styles', 'styles.xml'], ['rIdFooter', R + 'footer', 'footer1.xml']];
      if (logo) docRels.push(['rIdLogo', R + 'image', 'media/vestia-logo.png']);
      var files = [
        { name: '[Content_Types].xml', data: contentTypes(!!logo) },
        { name: '_rels/.rels', data: rels([['rId1', R + 'officeDocument', 'word/document.xml'],
          ['rId2', 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', 'docProps/core.xml']]) },
        { name: 'docProps/core.xml', data: coreXml(opts) },
        { name: 'word/document.xml', data: documentXml(answers, opts, logo) },
        { name: 'word/styles.xml', data: stylesXml() },
        { name: 'word/footer1.xml', data: footerXml() },
        { name: 'word/_rels/document.xml.rels', data: rels(docRels) }
      ];
      if (logo) files.push({ name: 'word/media/vestia-logo.png', data: logo.bytes });
      return zip(files);
    });
  }

  function download(answers, opts) {
    return build(answers, opts).then(function (blob) {
      var safe = opts.name.replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'party';
      var filename = 'Pre-mediation information (' + safe + ').docx';
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      return filename;
    });
  }

  window.VestiaDocx = { build: build, download: download };
})();
