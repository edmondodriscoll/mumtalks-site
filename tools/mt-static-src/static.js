/* Mum Talks – static-hosting helpers.
 * Replaces the WordPress server-side bits: event/directory filtering,
 * Contact Form 7 submissions, and header search. */
(function () {
  'use strict';

  var $all = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var slug = function (s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };
  var MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function parseDate(txt) {
    var m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/.exec(txt || '');
    if (!m) return null;
    return new Date(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  }

  /* ------------------------------------------------------------------ */
  /*  FILTERS (Upcoming events, event-type pages, Directory)              */
  /* ------------------------------------------------------------------ */
  function isFilterForm(form) {
    return !!(form && form.querySelector('.filter-category_option, .filter-order_option, .filter-directory_options, input[name="filter_date"]'));
  }

  function readState(form) {
    var st = { category: [], location: [], date: '', order: '' };
    var catHidden = form.querySelector('input[type=hidden][name="category"]');
    if (catHidden && catHidden.value) st.category = catHidden.value.split(',').filter(Boolean);
    $all('input.filter-category_option[data-field="category"]:checked', form).forEach(function (c) {
      if (c.value && st.category.indexOf(c.value) < 0) st.category.push(c.value);
    });
    var locHidden = form.querySelector('input[type=hidden][name="location"]');
    if (locHidden && locHidden.value) st.location = locHidden.value.split(',').filter(Boolean);
    var d = form.querySelector('input[name="filter_date"]');
    if (d) st.date = d.value;
    $all('select.filter-order_option', form).forEach(function (s) { if (s.value) st.order = s.value; });
    return st;
  }

  function writeUrl(st) {
    var p = new URLSearchParams();
    if (st.category.length) p.set('category', st.category.join(','));
    if (st.location.length) p.set('location', st.location.join(','));
    if (st.date) p.set('filter_date', st.date);
    if (st.order) p.set('order', st.order);
    var q = p.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
  }

  function sortItems(items, order, titleSel) {
    if (!items.length) return;
    var parent = items[0].parentNode;
    if (!parent.__mtOriginal) parent.__mtOriginal = items.slice();
    var list = parent.__mtOriginal.slice();
    if (order === 'ASC' || order === 'DESC') {
      list.sort(function (a, b) {
        var ta = titleOf(a, titleSel), tb = titleOf(b, titleSel);
        return order === 'ASC' ? ta.localeCompare(tb) : tb.localeCompare(ta);
      });
    }
    var anchor = parent.querySelector('.load-more-btn');
    list.forEach(function (el) { anchor && anchor.parentNode === parent ? parent.insertBefore(el, anchor) : parent.appendChild(el); });
  }
  function titleOf(el, sel) {
    return $all(sel, el).map(function (x) { return x.textContent.trim(); }).join(' ').toLowerCase();
  }

  function emptyNote(container, show, text) {
    var n = container.querySelector('.mt-empty');
    if (show && !n) {
      n = document.createElement('div');
      n.className = 'mt-empty col-12';
      n.textContent = text;
      container.appendChild(n);
    }
    if (n) n.style.display = show ? '' : 'none';
  }

  function applyEvents(st) {
    var items = $all('.event_list');
    if (!items.length) return;
    var active = st.category.length || st.location.length || st.date || st.order;
    sortItems(items, st.order, '.title-sec h3, .title-sec h4');
    var day = st.date ? new Date(st.date + 'T00:00:00') : null;
    var shown = 0;
    items.forEach(function (el) {
      var ok = true;
      if (st.category.length) ok = st.category.some(function (c) { return el.classList.contains(c); });
      if (ok && st.location.length) {
        var where = (titleOf(el, '.title-sec h4, .event_place') || '').toLowerCase();
        ok = st.location.some(function (l) { return where.indexOf(l.toLowerCase()) > -1; });
      }
      if (ok && day) {
        var li = el.querySelector('.event_content li');
        var d = parseDate(li ? li.textContent : '');
        ok = !!d && d.getTime() === day.getTime();
      }
      if (active) el.style.display = ok ? 'block' : 'none';
      if (ok) shown++;
    });
    $all('.up_events_list .load-more-btn').forEach(function (b) { b.style.display = active ? 'none' : ''; });
    var container = items[0].parentNode;
    emptyNote(container, active && shown === 0, 'Sorry, there are no events matching your filters right now. Please check back soon!');
  }

  function applyDirectory(st) {
    var items = $all('.dir_items');
    if (!items.length) return;
    var cats = st.category;
    var active = cats.length || st.order;
    sortItems(items, st.order, '.directory-card h5');
    var shown = 0;
    items.forEach(function (el) {
      var tags = $all('.directory-tag', el).map(function (t) { return slug(t.textContent); });
      var ok = !cats.length || cats.some(function (c) { return tags.indexOf(c) > -1; });
      if (active) el.style.display = ok ? 'block' : 'none';
      if (ok) shown++;
    });
    $all('.directory-cards .load-more-btn').forEach(function (b) { b.style.display = active ? 'none' : ''; });
    emptyNote(items[0].parentNode, active && shown === 0, 'No services found in this category yet.');
    // reflect the active category in the checkboxes
    $all('.filter-directory_options').forEach(function (c) { c.checked = cats.length ? cats.indexOf(c.value) > -1 : c.value === ''; });
  }

  function applyForm(form) {
    var st = readState(form);
    applyEvents(st);
    applyDirectory(st);
    writeUrl(st);
    // close the mobile filter drawer if open
    if (window.innerWidth < 992 && window.jQuery) {
      var g = window.jQuery('.up_events_genre:visible');
      if (g.length && document.documentElement.classList.contains('hidden')) {
        g.slideUp('slow'); document.documentElement.classList.remove('hidden');
      }
    }
  }

  // The theme calls form.submit() directly – route filter forms to the client-side filter.
  var nativeSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function () {
    if (isFilterForm(this)) { applyForm(this); return; }
    if (this.getAttribute('data-mt-form')) { handleCf7(this); return; }
    return nativeSubmit.apply(this, arguments);
  };
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (isFilterForm(f)) { e.preventDefault(); applyForm(f); }
  }, true);

  function initFiltersFromUrl() {
    var p = new URLSearchParams(location.search);
    var cat = (p.get('category') || '').split(',').filter(Boolean);
    var loc = (p.get('location') || '').split(',').filter(Boolean);
    var date = p.get('filter_date') || '';
    var order = p.get('order') || '';
    var forms = $all('form').filter(isFilterForm);
    if (!forms.length) return;
    forms.forEach(function (form) {
      var ch = form.querySelector('input[type=hidden][name="category"]'); if (ch) ch.value = cat.join(',');
      var lh = form.querySelector('input[type=hidden][name="location"]'); if (lh) lh.value = loc.join(',');
      $all('input.filter-category_option', form).forEach(function (c) {
        var f = c.getAttribute('data-field');
        if (f === 'category') c.checked = cat.indexOf(c.value) > -1;
        if (f === 'location') c.checked = loc.indexOf(c.value) > -1;
      });
      var d = form.querySelector('input[name="filter_date"]'); if (d) d.value = date;
      $all('select.filter-order_option', form).forEach(function (s) { s.value = order; });
    });
    if (cat.length || loc.length || date || order) applyForm(forms[0]);
  }

  /* ------------------------------------------------------------------ */
  /*  FORMS (newsletter + contact) – posts to /forms/submit.php           */
  /* ------------------------------------------------------------------ */
  var MSG = {
    ok: 'Thank you for your message. It has been sent.',
    okNews: 'Thank you for subscribing! Keep an eye on your inbox.',
    invalid: 'One or more fields have an error. Please check and try again.',
    fail: 'There was an error trying to send your message. Please try again later.',
    required: 'Please fill out this field.',
    email: 'Please enter an email address.'
  };

  function clearTips(form) {
    $all('.wpcf7-not-valid-tip', form).forEach(function (t) { t.remove(); });
    $all('.wpcf7-not-valid', form).forEach(function (f) { f.classList.remove('wpcf7-not-valid'); f.removeAttribute('aria-invalid'); });
  }
  function tip(field, text) {
    field.classList.add('wpcf7-not-valid');
    field.setAttribute('aria-invalid', 'true');
    var t = document.createElement('span');
    t.className = 'wpcf7-not-valid-tip'; t.setAttribute('aria-hidden', 'true'); t.textContent = text;
    (field.closest('.wpcf7-form-control-wrap') || field.parentNode).appendChild(t);
  }
  function setStatus(form, status, text) {
    ['init', 'submitting', 'invalid', 'sent', 'failed'].forEach(function (c) { form.classList.remove(c); });
    form.classList.add(status);
    form.setAttribute('data-status', status);
    var out = form.querySelector('.wpcf7-response-output');
    if (out) { out.textContent = text || ''; out.setAttribute('aria-hidden', text ? 'false' : 'true'); }
  }

  function handleCf7(form) {
    clearTips(form);
    var bad = false;
    $all('input, textarea, select', form).forEach(function (f) {
      if (f.type === 'hidden' || f.type === 'submit' || f.type === 'reset') return;
      var req = f.getAttribute('aria-required') === 'true' || f.required;
      var v = (f.value || '').trim();
      if (req && !v) { tip(f, MSG.required); bad = true; return; }
      if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { tip(f, MSG.email); bad = true; }
    });
    // required acceptance / checkbox groups
    $all('.wpcf7-validates-as-required.wpcf7-checkbox, .wpcf7-acceptance', form).forEach(function (g) {
      if (!g.querySelector('input:checked')) { tip(g, MSG.required); bad = true; }
    });
    if (bad) { setStatus(form, 'invalid', MSG.invalid); return; }

    setStatus(form, 'submitting', '');
    var fd = new FormData(form);
    var isNews = !!form.querySelector('input[name="checkbox[]"]') || /f85/.test(form.getAttribute('action') || '') || fd.get('_wpcf7') === '85';
    fetch(form.getAttribute('action') || '/forms/submit.php', {
      method: 'POST', body: fd, headers: { 'Accept': 'application/json' }
    }).then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
      .then(function (j) {
        if (j && (j.ok || j.status === 'mail_sent')) {
          setStatus(form, 'sent', j.message || (isNews ? MSG.okNews : MSG.ok));
          form.reset();
        } else {
          setStatus(form, 'failed', (j && j.message) || MSG.fail);
        }
      })
      .catch(function () { setStatus(form, 'failed', MSG.fail); });
  }

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.getAttribute && f.getAttribute('data-mt-form')) { e.preventDefault(); handleCf7(f); }
  }, true);

  // "sent" flag when the form fell back to a normal POST (no JS fetch)
  function showFallbackStatus() {
    var p = new URLSearchParams(location.search);
    if (!p.has('mt_sent')) return;
    var f = document.querySelector('form[data-mt-form]');
    if (f) setStatus(f, p.get('mt_sent') === '1' ? 'sent' : 'failed', p.get('mt_sent') === '1' ? MSG.ok : MSG.fail);
  }

  /* ------------------------------------------------------------------ */
  function ready(fn) { document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    // wait for the theme's load-more script to run first
    setTimeout(initFiltersFromUrl, 0);
    showFallbackStatus();
    // highlight Blog in the nav when on /blog/
    if (/^\/blog\//.test(location.pathname)) {
      $all('.menu-item-blog').forEach(function (li) { li.classList.add('current-menu-item'); });
    }
  });
})();
