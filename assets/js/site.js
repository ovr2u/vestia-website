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
  function setMenu(open, returnFocus) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    var label = menuBtn.querySelector('.menu-label');
    if (label) label.textContent = open ? 'Close' : 'Menu';
    doc.documentElement.classList.toggle('menu-open', open);
    if (!open && returnFocus) menuBtn.focus();
  }
  if (menuBtn && nav) {
    // Tapping the dimmed page behind the open mobile menu closes it.
    var backdrop = doc.createElement('div');
    backdrop.className = 'menu-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(backdrop);
    backdrop.addEventListener('click', function () { setMenu(false); });
    menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
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
    if (nav && nav.classList.contains('open') && !doc.querySelector('.subnav.open')) { setMenu(false, true); return; }
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

  /* ---------- 2. Forms ----------
     Everyday forms carry data-formspree once a Formspree ID is set in _build/build.py, and are sent in the
     background. Until then, and always for the confidential pre-mediation form, forms carry data-mailto and
     open the visitor's own email app. The pre-mediation form can also produce a Word document (docx.js). */
  var MAILTO_SOFT_LIMIT = 1900; // some email apps cut off very long mailto links
  var PHONE = '0330 133 5199';

  function labelFor(el, fullQuestion) {
    if (el.dataset.label && !fullQuestion) return el.dataset.label;
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

  function longDate(iso) {
    var d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Reads a form into an ordered list of answers: { section, label, value, long, name }.
  function collectAnswers(form) {
    var out = [];
    var seen = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.name.charAt(0) === '_' || el.type === 'submit' || el.type === 'button' ||
          el.type === 'hidden' || el.dataset.skip !== undefined) return;
      var sec = el.closest('[data-section]');
      var item = { section: sec ? sec.dataset.section : '', label: labelFor(el), question: labelFor(el, true),
        name: el.name, long: el.tagName === 'TEXTAREA' };
      if (el.type === 'radio' || el.type === 'checkbox') {
        if (seen[el.name]) return;
        seen[el.name] = true;
        var group = form.querySelectorAll('[name="' + el.name + '"]');
        if (group.length === 1 && el.type === 'checkbox') {
          item.value = el.checked ? 'Yes' : 'No';
        } else {
          item.value = Array.prototype.filter.call(group, function (g) { return g.checked; })
            .map(function (g) { return g.value; }).join(', ');
        }
      } else {
        item.value = (el.value || '').trim();
        if (el.type === 'date' && item.value) item.value = longDate(item.value);
      }
      out.push(item);
    });
    return out;
  }

  // Plain-text version of the answers. With { email: true } section headings are underlined for email.
  function formToText(form, opts) {
    var lines = [];
    var section = null;
    collectAnswers(form).forEach(function (a) {
      if (a.section && a.section !== section) {
        section = a.section;
        var h = a.section.toUpperCase();
        lines.push('', h);
        if (opts && opts.email) lines.push(new Array(h.length + 1).join('='));
      }
      if (a.long) lines.push(a.label + ':', a.value || '(not given)', '');
      else lines.push(a.label + ': ' + (a.value || '(not given)'));
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

  // Builds a status message from text pieces and [text, href] link pairs.
  function message(parts) {
    var frag = doc.createDocumentFragment();
    parts.forEach(function (p) {
      if (typeof p === 'string') { frag.appendChild(doc.createTextNode(p)); return; }
      var a = doc.createElement(p[2] ? 'button' : 'a');
      a.textContent = p[0];
      if (p[2]) { a.type = 'button'; a.className = 'link-button'; a.addEventListener('click', p[2]); }
      else a.href = p[1];
      frag.appendChild(a);
    });
    return frag;
  }

  function contactFallback(email) {
    return [' If nothing opens, email ', [email, 'mailto:' + email], ' or call ' + PHONE + '.'];
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    return Promise.resolve(false);
  }

  function mailtoHref(email, subject, body) {
    return 'mailto:' + email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  function openMail(form, href) {
    form.dispatchEvent(new CustomEvent('vestia:mailto', { bubbles: true, detail: href }));
    window.location.href = href;
  }

  function sendMail(form) {
    var email = form.dataset.mailto || form.dataset.email;
    var subject = fill(form.dataset.subject || 'Website enquiry', form);
    var intro = form.dataset.intro ? form.dataset.intro + '\n\n' : '';
    var full = intro + formToText(form, { email: true }) + '\n\nSent from vestiamediation.co.uk';
    var href = mailtoHref(email, subject, full);
    if (href.length > MAILTO_SOFT_LIMIT) {
      copyText(full).then(function (ok) {
        setStatus(form, message(['Your email app should now open with your answers. Because they are long, some email apps shorten them, so ' +
          (ok ? 'we have also copied everything to your clipboard: paste it into the email if anything is missing.'
              : 'please check the email is complete before sending.')].concat(contactFallback(email))), 'ok');
      });
    } else {
      setStatus(form, message(['Your email app should now open with everything filled in. Just press send.'].concat(contactFallback(email))), 'ok');
    }
    openMail(form, href);
  }

  // Sends a form to Formspree in the background, with readable field names in the email Vestia receives.
  function sendFormspree(form, onDone) {
    var data = new FormData();
    data.append('_subject', fill(form.dataset.subject || 'Website enquiry', form));
    if (form.dataset.formName) data.append('Form', form.dataset.formName);
    collectAnswers(form).forEach(function (a) {
      var key = a.name === 'email' ? 'email' : a.label;
      data.append(key, a.value || '(not given)');
    });
    var trap = form.elements._gotcha;
    if (trap) data.append('_gotcha', trap.value);
    var btns = form.querySelectorAll('button[type=submit]');
    btns.forEach(function (b) { b.disabled = true; });
    setStatus(form, message(['Sending...']));
    fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function () {
        setStatus(form, message([form.dataset.success ||
          'Thank you. Your message has reached us and we\'ll be in touch soon, usually within one working day.']), 'ok');
        form.reset();
        if (onDone) onDone(true);
      })
      .catch(function () {
        setStatus(form, message(['Sorry, that didn\'t send. Please try again, ',
          ['send it by email instead', '', function () { sendMail(form); }],
          ', or call ' + PHONE + '.']), 'error');
        if (onDone) onDone(false);
      })
      .then(function () { btns.forEach(function (b) { b.disabled = false; }); });
  }

  function validate(form) {
    form.removeAttribute('novalidate');
    var valid = form.reportValidity();
    form.setAttribute('novalidate', '');
    return valid;
  }

  function submitForm(form, onDone) {
    if (form.hasAttribute('data-formspree')) sendFormspree(form, onDone);
    else sendMail(form);
  }

  // Confidential pre-mediation form: download a Word document, then open an email to attach it to.
  function sendDocx(form) {
    var name = (form.elements.name && form.elements.name.value.trim()) || 'party';
    var email = form.dataset.mailto;
    var logo = doc.querySelector('.footer-brand img');
    setStatus(form, message(['Preparing your document...']));
    window.VestiaDocx.download(collectAnswers(form), {
      name: name,
      logoUrl: logo ? logo.src : null
    }).then(function (filename) {
      var href = mailtoHref(email, fill(form.dataset.subject, form),
        'Dear Vestia,\n\nPlease find attached my completed pre-mediation information form.\n\nKind regards,\n' + name);
      setStatus(form, message(['Your answers have been saved as "' + filename + '" (check your downloads). Next, ',
        ['open an email to Vestia', '', function () { openMail(form, href); }],
        ' and attach the document before you press send.']), 'ok');
    }, function () {
      setStatus(form, message(['Sorry, we couldn\'t create the document in this browser. Please ',
        ['send your answers by email instead', '', function () { sendMail(form); }], '.']), 'error');
    });
  }

  doc.querySelectorAll('form[data-mailto], form[data-formspree]').forEach(function (form) {
    if (form.id === 'intake-form') return; // handled by the wizard below
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      var action = e.submitter && e.submitter.dataset.action;
      if (action === 'docx' && window.VestiaDocx) sendDocx(form);
      else submitForm(form);
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
      submitForm(intake, function (ok) { if (ok) intake.classList.add('is-sent'); });
    });
    copy.addEventListener('click', function () {
      copyText(formToText(intake, { email: true })).then(function (ok) {
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
