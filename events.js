(function () {
  var list = document.querySelector('.events');
  if (!list) return;
  var now = new Date();
  var items = Array.prototype.slice.call(list.querySelectorAll('.event'));
  var visible = [];
  items.forEach(function (el) {
    var p = (el.getAttribute('data-end') || '').split('-');
    var end = new Date(+p[0], +p[1] - 1, +p[2], 23, 59, 59, 999);
    if (p.length === 3 && end < now) {
      el.hidden = true;
    } else {
      el.hidden = false;
      visible.push(el);
    }
  });
  if (list.getAttribute('data-list') === 'home') {
    visible.forEach(function (el, i) {
      el.classList.toggle('over', i >= 3);
      el.classList.toggle('over-m', i === 2);
    });
  }
  var none = document.getElementById('no-events');
  if (none) none.hidden = visible.length > 0;
  if (!visible.length) list.hidden = true;
})();
