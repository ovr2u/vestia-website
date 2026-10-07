/* Vestia Mediation: small progressive-enhancement script. No frameworks, no tracking.
   1. Mobile menu and Services submenu
   2. Mailto forms (booking block, contact, booking request, pre-mediation form, booking page)
   3. Mediation intake wizard
   Every form still works without JavaScript: it falls back to a plain mailto: submit. */
(function () {
  'use strict';
  var doc = document;

  /* ---------- 1. Navigation ---------- */
  var menuBtn = doc.querySelector('.menu-toggle');
  var nav = doc.getElementById('primary-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  doc.querySelectorAll('.sub-toggle').forEach(function (btn) {
    var sub = doc.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', function () {
      var open = sub.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    doc.querySelectorAll('.subnav.open').forEach(function (sub) {
      sub.classList.remove('open');
      var t = doc.querySelector('[aria-controls="' + sub.id + '"]');
      if (t) { t.setAttribute('aria-expanded', 'false'); t.focus(); }
    });
  });
  doc.addEventListener('click', function (e) {
    doc.querySelectorAll('.subnav.open').forEach(function (sub) {
      if (!sub.parentNode.contains(e.target)) {
        sub.classList.remove('open');
        var t = doc.querySelector('[aria-controls="' + sub.id + '"]');
        if (t) t.setAttribute('aria-expanded', 'false');
      }
    });
  });

  /* ---------- 2. Mailto forms ---------- */
  var MAILTO_SOFT_LIMIT = 1900; // some email apps cut off very long mailto links

  function labelFor(el) {
    if (el.dataset.label) return el.dataset.label;
    var lab = el.id ? doc.querySelector('label[for="' + el.id + '"]') : null;
    if (!lab && (el.type === 'radio' || el.type === 'checkbox')) {
      var fs = el.closest('fieldset');
      lab = fs ? fs.querySelector('legend') : null;
    }
    if (!lab) return el.name;
    var clone = lab.cloneNode(true);
    clone.querySelectorAll('.opt, .hint').forEach(function (n) { n.remove(); });
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  // Turns a form into a plain-text summary, grouped by data-section headings.
  function formToText(form) {
    var lines = [];
    var seen = {};
    var section = null;
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.type === 'submit' || el.type === 'button' || el.dataset.skip !== undefined) return;
      var sec = el.closest('[data-section]');
      var secName = sec ? sec.dataset.section : null;
      if (secName && secName !== section) {
        section = secName;
        lines.push('', secName.toUpperCase());
      }
      if (el.type === 'radio' || el.type === 'checkbox') {
        if (seen[el.name]) return;
        seen[el.name] = true;
        var group = form.querySelectorAll('[name="' + el.name + '"]');
        if (group.length === 1 && el.type === 'checkbox') {
          lines.push(labelFor(el) + ': ' + (el.checked ? 'Yes' : 'No'));
          return;
        }
        var picked = Array.prototype.filter.call(group, function (g) { return g.checked; })
          .map(function (g) { return g.value; });
        lines.push(labelFor(el) + ': ' + (picked.length ? picked.join(', ') : '(not given)'));
        return;
      }
      var v = (el.value || '').trim();
      if (el.tagName === 'TEXTAREA') {
        lines.push(labelFor(el) + ':', v || '(not given)', '');
      } else {
        lines.push(labelFor(el) + ': ' + (v || '(not given)'));
      }
    });
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function fill(template, form) {
    return template.replace(/\{(\w+)\}/g, function (_, key) {
      var el = form.elements[key];
      if (!el) return '';
      if (el.length && !el.tagName) { // RadioNodeList
        return el.value || '';
      }
      return (el.value || '').trim();
    }).replace(/:\s*$/, '').trim();
  }

  function setStatus(form, msg, kind) {
    var box = form.querySelector('.form-status');
    if (!box) return;
    box.className = 'form-status' + (kind ? ' is-' + kind : '');
    box.textContent = '';
    if (msg) box.appendChild(msg);
  }

  function statusMessage(text, email) {
    var frag = doc.createDocumentFragment();
    frag.appendChild(doc.createTextNode(text + ' If nothing opens, email '));
    var a = doc.createElement('a');
    a.href = 'mailto:' + email;
    a.textContent = email;
    frag.appendChild(a);
    frag.appendChild(doc.createTextNode(' or call 0330 133 5199.'));
    return frag;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    return Promise.resolve(false);
  }

  function sendMail(form, body) {
    var email = form.dataset.mailto;
    var subject = fill(form.dataset.subject || 'Website enquiry', form);
    var intro = form.dataset.intro ? form.dataset.intro + '\n\n' : '';
    var full = intro + body + '\n\nSent from vestiamediation.co.uk';
    var href = 'mailto:' + email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(full);
    if (href.length > MAILTO_SOFT_LIMIT) {
      copyText(full).then(function (ok) {
        setStatus(form, statusMessage(
          'Your email app should now open with your answers. Because they are long, some email apps shorten them, so ' +
          (ok ? 'we have also copied everything to your clipboard: paste it into the email if anything is missing.'
              : 'please check the email is complete before sending.'), email), 'ok');
      });
    } else {
      setStatus(form, statusMessage('Your email app should now open with everything filled in. Just press send.', email), 'ok');
    }
    form.dispatchEvent(new CustomEvent('vestia:mailto', { bubbles: true, detail: href }));
    window.location.href = href;
  }

  doc.querySelectorAll('form[data-mailto]').forEach(function (form) {
    if (form.id === 'intake-form') return; // handled by the wizard below
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.removeAttribute('novalidate');
      var valid = form.reportValidity();
      form.setAttribute('novalidate', '');
      if (!valid) return;
      sendMail(form, formToText(form));
    });
  });

  /* ---------- 3. Intake wizard ---------- */
  var intake = doc.getElementById('intake-form');
  if (intake) {
    var steps = Array.prototype.slice.call(intake.querySelectorAll('[data-step]'));
    var progress = intake.querySelector('.wizard-progress');
    var count = intake.querySelector('.wizard-count');
    var back = intake.querySelector('[data-back]');
    var next = intake.querySelector('[data-next]');
    var send = intake.querySelector('[data-send]');
    var copy = intake.querySelector('[data-copy]');
    var summary = intake.querySelector('.summary');
    var current = 0;

    progress.innerHTML = steps.map(function () { return '<i></i>'; }).join('');
    intake.setAttribute('novalidate', '');

    function stepValid(step) {
      var ok = true;
      var groups = {};
      step.querySelectorAll('input, select, textarea').forEach(function (el) {
        if (el.type === 'radio') {
          if (el.required) groups[el.name] = groups[el.name] || intake.querySelector('[name="' + el.name + '"]:checked') !== null;
          return;
        }
        if (!el.checkValidity()) ok = false;
      });
      Object.keys(groups).forEach(function (k) { if (!groups[k]) ok = false; });
      return ok;
    }

    function show(i, focus) {
      current = i;
      steps.forEach(function (s, n) { s.classList.toggle('is-current', n === i); });
      progress.querySelectorAll('i').forEach(function (bar, n) { bar.classList.toggle('on', n <= i); });
      count.textContent = 'Step ' + (i + 1) + ' of ' + steps.length;
      back.hidden = i === 0;
      var last = i === steps.length - 1;
      next.hidden = last;
      send.hidden = !last;
      copy.hidden = !last;
      if (last) summary.textContent = formToText(intake);
      setStatus(intake, null);
      if (focus) {
        var t = steps[i].querySelector('.step-title');
        if (t) { t.setAttribute('tabindex', '-1'); t.focus(); }
      }
    }

    next.addEventListener('click', function () {
      if (!stepValid(steps[current])) {
        var first = steps[current].querySelector('input:invalid, select:invalid, textarea:invalid');
        if (first && first.type !== 'radio') { intake.removeAttribute('novalidate'); first.reportValidity(); intake.setAttribute('novalidate', ''); }
        else {
          var m = doc.createDocumentFragment();
          m.appendChild(doc.createTextNode('Please choose an option to continue.'));
          setStatus(intake, m, 'error');
        }
        return;
      }
      show(current + 1, true);
    });
    back.addEventListener('click', function () { show(current - 1, true); });
    intake.addEventListener('submit', function (e) {
      e.preventDefault();
      if (current !== steps.length - 1) { next.click(); return; }
      sendMail(intake, formToText(intake));
    });
    copy.addEventListener('click', function () {
      copyText(formToText(intake)).then(function (ok) {
        var m = doc.createDocumentFragment();
        m.appendChild(doc.createTextNode(ok ? 'Summary copied. You can paste it into an email to enquiries@vestiamediation.co.uk.'
          : 'Copying did not work in this browser. Please select the summary text and copy it.'));
        setStatus(intake, m, ok ? 'ok' : 'error');
      });
    });
    intake.addEventListener('change', function () { setStatus(intake, null); });
    show(0, false);
  }
})();
