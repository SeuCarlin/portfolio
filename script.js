const header = document.querySelector(".site-header");
const lightbox = document.querySelector(".lightbox");
const lightboxImage = lightbox.querySelector("img");
const lightboxCaption = lightbox.querySelector("figcaption");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const filmCanvas = document.querySelector(".film-background");
const filmContext = filmCanvas.getContext("2d", { alpha: false });

const film = {
  width: 0,
  height: 0,
  frame: 0,
  previousTime: 0,
  animationId: 0,
  dust: [],
  scratches: [],
  vignette: null,
  noiseCanvas: document.createElement("canvas"),
  noiseContext: null,
  noisePattern: null,
};

film.noiseCanvas.width = 180;
film.noiseCanvas.height = 180;
film.noiseContext = film.noiseCanvas.getContext("2d", { alpha: false });

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function createDustParticle(initial = false) {
  return {
    x: Math.random() * film.width,
    y: initial ? Math.random() * film.height : -12,
    size: randomBetween(0.45, 2.8),
    speed: randomBetween(4, 22),
    drift: randomBetween(-3.5, 3.5),
    opacity: randomBetween(0.07, 0.42),
    phase: Math.random() * Math.PI * 2,
    square: Math.random() > 0.6,
  };
}

function rebuildFilmScene() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  film.width = window.innerWidth;
  film.height = window.innerHeight;
  filmCanvas.width = Math.round(film.width * pixelRatio);
  filmCanvas.height = Math.round(film.height * pixelRatio);
  filmContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const dustAmount = Math.round(Math.min(175, Math.max(70, film.width * film.height / 8500)));
  film.dust = Array.from({ length: dustAmount }, () => createDustParticle(true));
  film.scratches = [];
  film.vignette = filmContext.createRadialGradient(
    film.width / 2,
    film.height / 2,
    Math.min(film.width, film.height) * 0.12,
    film.width / 2,
    film.height / 2,
    Math.max(film.width, film.height) * 0.72,
  );
  film.vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  film.vignette.addColorStop(0.68, "rgba(0, 0, 0, 0.13)");
  film.vignette.addColorStop(1, "rgba(0, 0, 0, 0.68)");
}

function refreshNoise() {
  const { width, height } = film.noiseCanvas;
  const imageData = film.noiseContext.createImageData(width, height);
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const grain = Math.random() * 64;
    pixels[index] = grain;
    pixels[index + 1] = grain * 1.03;
    pixels[index + 2] = grain * 1.01;
    pixels[index + 3] = 255;
  }

  film.noiseContext.putImageData(imageData, 0, 0);
  film.noisePattern = filmContext.createPattern(film.noiseCanvas, "repeat");
}

function addScratch() {
  const vertical = Math.random() > 0.25;
  film.scratches.push({
    x: Math.random() * film.width,
    y: Math.random() * film.height,
    length: vertical ? randomBetween(45, film.height * 0.68) : randomBetween(35, 190),
    opacity: randomBetween(0.05, 0.22),
    life: Math.round(randomBetween(5, 24)),
    vertical,
    bend: randomBetween(-10, 10),
  });
}

function drawFilmFrame(time = 0) {
  const elapsed = Math.min(0.05, (time - film.previousTime) / 1000 || 0.016);
  film.previousTime = time;
  film.frame += 1;

  filmContext.fillStyle = film.frame % 9 === 0 ? "#151716" : "#111312";
  filmContext.fillRect(0, 0, film.width, film.height);

  if (film.frame % 3 === 0) refreshNoise();
  filmContext.save();
  filmContext.globalAlpha = 0.32 + Math.random() * 0.07;
  filmContext.fillStyle = film.noisePattern;
  filmContext.fillRect(0, 0, film.width, film.height);
  filmContext.restore();

  filmContext.fillStyle = "#f5f1e8";
  film.dust.forEach((particle) => {
    particle.y += particle.speed * elapsed;
    particle.x += (particle.drift + Math.sin(time * 0.0007 + particle.phase) * 2.4) * elapsed;

    if (particle.y > film.height + 15 || particle.x < -15 || particle.x > film.width + 15) {
      Object.assign(particle, createDustParticle(false));
    }

    filmContext.globalAlpha = particle.opacity * randomBetween(0.55, 1);
    if (particle.square) {
      filmContext.fillRect(particle.x, particle.y, particle.size, particle.size);
    } else {
      filmContext.beginPath();
      filmContext.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      filmContext.fill();
    }
  });
  filmContext.globalAlpha = 1;

  if (Math.random() < 0.045 && film.scratches.length < 4) addScratch();
  film.scratches = film.scratches.filter((scratch) => {
    filmContext.beginPath();
    filmContext.globalAlpha = scratch.opacity * Math.min(1, scratch.life / 4);
    filmContext.strokeStyle = "#e8e7df";
    filmContext.lineWidth = Math.random() > 0.85 ? 1.2 : 0.45;
    filmContext.moveTo(scratch.x, scratch.y);
    if (scratch.vertical) {
      filmContext.quadraticCurveTo(
        scratch.x + scratch.bend,
        scratch.y + scratch.length / 2,
        scratch.x + scratch.bend * 0.25,
        scratch.y + scratch.length,
      );
    } else {
      filmContext.quadraticCurveTo(
        scratch.x + scratch.length / 2,
        scratch.y + scratch.bend,
        scratch.x + scratch.length,
        scratch.y + scratch.bend * 0.2,
      );
    }
    filmContext.stroke();
    scratch.life -= 1;
    return scratch.life > 0;
  });
  filmContext.globalAlpha = 1;

  filmContext.fillStyle = film.vignette;
  filmContext.fillRect(0, 0, film.width, film.height);

  if (!reducedMotion) film.animationId = requestAnimationFrame(drawFilmFrame);
}

rebuildFilmScene();
refreshNoise();
drawFilmFrame();

window.addEventListener("resize", rebuildFilmScene);
document.addEventListener("visibilitychange", () => {
  cancelAnimationFrame(film.animationId);
  if (!document.hidden && !reducedMotion) {
    film.previousTime = performance.now();
    film.animationId = requestAnimationFrame(drawFilmFrame);
  }
});

function renderGallery() {
  const catalog = document.querySelector("#gallery-catalog");
  const categories = Array.isArray(window.galleryData) ? window.galleryData : [];
  const categoryNames = {
    "artes-de-hero": "Artes de Hero",
    autorais: "Projetos Autorais",
    "autoretratos-e-fanarts": "Autorretratos e Fanarts",
    comissions: "Commissions",
    subee: "Subee",
  };
  let globalIndex = 0;

  categories.forEach((category, categoryIndex) => {
    const heading = document.createElement("div");
    heading.className = "category reveal";
    heading.id = category.id;

    const number = document.createElement("span");
    number.textContent = String(categoryIndex + 1).padStart(2, "0");

    const title = document.createElement("h3");
    title.textContent = categoryNames[category.id] || category.name;

    const count = document.createElement("span");
    count.textContent = `${category.count} artes`;

    heading.append(number, title, count);
    catalog.append(heading);

    const grid = document.createElement("div");
    grid.className = "art-grid";

    category.items.forEach((item, itemIndex) => {
      globalIndex += 1;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "art-card reveal";
      card.dataset.image = item.src;
      card.dataset.title = item.title;
      card.setAttribute("aria-label", `Ampliar ${item.title}`);

      if (itemIndex % 5 === 1 || itemIndex % 5 === 4) card.classList.add("art-card--wide");
      if (itemIndex % 5 === 2) card.classList.add("art-card--portrait");

      if (itemIndex % 4 === 0) {
        const tape = document.createElement("span");
        tape.className = "art-card__tape";
        card.append(tape);
      }

      const image = document.createElement("img");
      image.src = item.src;
      image.alt = item.title;
      image.loading = "lazy";
      image.decoding = "async";

      const meta = document.createElement("span");
      meta.className = "art-card__meta";
      const itemTitle = document.createElement("strong");
      itemTitle.textContent = item.title;
      const project = document.createElement("small");
      project.textContent = item.project;
      meta.append(itemTitle, project);

      const itemNumber = document.createElement("span");
      itemNumber.className = "art-card__number";
      itemNumber.textContent = String(globalIndex).padStart(2, "0");

      card.append(image, meta, itemNumber);
      grid.append(card);
    });

    catalog.append(grid);
  });

  const deepLinkTarget = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  if (deepLinkTarget) {
    deepLinkTarget.classList.add("is-visible");
    deepLinkTarget.nextElementSibling
      ?.querySelectorAll(".art-card:nth-child(-n + 4)")
      .forEach((card) => card.classList.add("is-visible"));
    requestAnimationFrame(() => deepLinkTarget.scrollIntoView());
  }
}

renderGallery();

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.12 },
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

window.addEventListener(
  "scroll",
  () => header.classList.toggle("is-active", window.scrollY > window.innerHeight * 0.45),
  { passive: true },
);

document.querySelectorAll(".art-card").forEach((card) => {
  card.addEventListener("click", () => {
    lightboxImage.src = card.dataset.image;
    lightboxImage.alt = card.querySelector("img").alt;
    lightboxCaption.textContent = card.dataset.title;
    lightbox.showModal();
  });
});

function closeLightbox() {
  lightbox.close();
  lightboxImage.src = "";
}

lightbox.querySelector(".lightbox__close").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});

if (!reducedMotion) {
  window.addEventListener("pointermove", (event) => {
    document.body.style.setProperty("--pointer-x", `${event.clientX}px`);
    document.body.style.setProperty("--pointer-y", `${event.clientY}px`);
  });
}

document.querySelector("#year").textContent = new Date().getFullYear();
