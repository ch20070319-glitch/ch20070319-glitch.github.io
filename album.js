(() => {
  const viewer = document.querySelector('#photo-viewer');
  const image = document.querySelector('#viewer-image');
  const caption = document.querySelector('#viewer-caption');
  const counter = document.querySelector('#viewer-counter');
  const buttons = [...document.querySelectorAll('[data-photo]')];
  const photos = buttons.map(button => ({
    src: button.querySelector('img').getAttribute('src'),
    alt: button.querySelector('img').alt,
    caption: button.closest('figure').querySelector('.photo-caption').textContent
  }));
  let current = 0;
  let opener;
  function show(index) {
    current = (index + photos.length) % photos.length;
    const photo = photos[current];
    image.src = photo.src;
    image.alt = photo.alt;
    caption.textContent = photo.caption;
    counter.textContent = 'FRAME / ' + String(current + 1).padStart(2, '0') + ' — ' + String(photos.length).padStart(2, '0');
  }
  buttons.forEach((button, index) => button.addEventListener('click', () => {
    opener = button;
    show(index);
    viewer.showModal();
    document.body.style.overflow = 'hidden';
  }));
  document.querySelector('.viewer-prev').addEventListener('click', () => show(current - 1));
  document.querySelector('.viewer-next').addEventListener('click', () => show(current + 1));
  document.querySelector('.viewer-close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  viewer.addEventListener('click', event => {
    if (event.target !== viewer) return;
    const rect = viewer.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) viewer.close();
  });
  viewer.addEventListener('close', () => {
    document.body.style.overflow = '';
    if (opener && !opener.closest('[data-page]').hidden) opener.focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', () => { if (viewer.open) viewer.close(); });
})();
