import { animate, onScroll, stagger } from "./vendor/anime.esm.min.js";

const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const random = (min, max) => min + Math.random() * (max - min);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const scenes = $$(".scene");
let active = 0;

const STAR_LAYERS = [
  { count: 150, depth: 0.18, alpha: 0.55, color: "#3a4a6e" },
  { count: 95, depth: 0.42, alpha: 0.75, color: "#7f9fd6" },
  { count: 46, depth: 0.9, alpha: 1, color: "#cfe6ff" },
];

const CLOUDS = [
  { x: 0.22, y: 0.28, radius: 330, rgb: "198,255,61" },
  { x: 0.82, y: 0.2, radius: 300, rgb: "61,220,255" },
  { x: 0.35, y: 0.8, radius: 340, rgb: "167,139,250" },
  { x: 0.78, y: 0.72, radius: 290, rgb: "255,110,199" },
];

function createSky(canvas) {
  const ctx = canvas.getContext("2d");
  const cloudAlpha = CLOUDS.map(() => 0.045);
  let width = 0;
  let height = 0;
  let stars = [];
  let meteors = [];
  let time = 0;
  let lastScroll = window.scrollY;
  let warp = 0;
  let direction = 1;
  let pointerX = 0;
  let pointerY = 0;
  let frame = 0;

  const build = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const density = width < 720 ? 0.55 : 1;
    stars = STAR_LAYERS.flatMap((layer) =>
      Array.from({ length: Math.round(layer.count * density) }, () => ({
        layer,
        x: random(0, width),
        y: random(0, height),
        size: random(0.4, 1.6) * (0.5 + layer.depth),
        phase: random(0, Math.PI * 2),
        rate: random(0.3, 1.4),
      })),
    );
    meteors = [];
  };

  const drawClouds = () => {
    CLOUDS.forEach((cloud, index) => {
      const target = index === active ? 0.105 : 0.04;
      cloudAlpha[index] += (target - cloudAlpha[index]) * 0.03;
      const radius = cloud.radius * (1 + Math.sin(time * 0.25 + index * 2) * 0.1);
      const x = cloud.x * width;
      const y = cloud.y * height;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${cloud.rgb},${cloudAlpha[index]})`);
      gradient.addColorStop(1, `rgba(${cloud.rgb},0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    });
  };

  const drawStars = (scrollDelta) => {
    for (const star of stars) {
      const { depth, alpha, color } = star.layer;
      star.y += 0.015 + depth * 0.03 - scrollDelta * depth * 0.32;
      if (star.y > height + 4) {
        star.y = -4;
        star.x = random(0, width);
      } else if (star.y < -4) {
        star.y = height + 4;
        star.x = random(0, width);
      }
      const x = star.x - pointerX * 18 * depth;
      const y = star.y - pointerY * 12 * depth;
      const streak = warp * depth * 46;
      ctx.globalAlpha = alpha * (0.55 + 0.45 * Math.sin(time * star.rate + star.phase)) * (1 - warp * 0.4);
      if (streak > 1.5) {
        ctx.strokeStyle = color;
        ctx.lineWidth = star.size * 0.9;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + direction * streak);
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  const drawMeteors = () => {
    if (Math.random() < 0.012 && meteors.length < 2) {
      meteors.push({
        x: random(0.25, 0.85) * width,
        y: random(0.05, 0.3) * height,
        vx: random(-7, -4),
        vy: random(2.4, 3.4),
        life: 1,
      });
    }
    meteors = meteors.filter((meteor) => meteor.life > 0);
    for (const meteor of meteors) {
      meteor.x += meteor.vx;
      meteor.y += meteor.vy;
      meteor.life -= 0.018;
      const tailX = meteor.x - meteor.vx * 9;
      const tailY = meteor.y - meteor.vy * 9;
      const gradient = ctx.createLinearGradient(meteor.x, meteor.y, tailX, tailY);
      gradient.addColorStop(0, `rgba(220,255,255,${0.9 * Math.max(meteor.life, 0)})`);
      gradient.addColorStop(1, "rgba(220,255,255,0)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(meteor.x, meteor.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
  };

  const draw = (animated) => {
    time += 0.016;
    const scrollDelta = window.scrollY - lastScroll;
    lastScroll = window.scrollY;
    if (scrollDelta !== 0) direction = Math.sign(scrollDelta);
    warp += (clamp(Math.abs(scrollDelta) / 26, 0, 1) - warp) * 0.14;

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";
    drawClouds();
    drawStars(animated ? scrollDelta : 0);
    if (animated) drawMeteors();
    ctx.globalCompositeOperation = "source-over";
  };

  const loop = () => {
    draw(true);
    frame = requestAnimationFrame(loop);
  };

  const start = () => {
    if (!frame) frame = requestAnimationFrame(loop);
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  build();
  window.addEventListener("resize", () => {
    build();
    if (still) draw(false);
  });

  if (still) {
    draw(false);
    return;
  }

  if (finePointer) {
    window.addEventListener(
      "pointermove",
      (event) => {
        pointerX = (event.clientX / width) * 2 - 1;
        pointerY = (event.clientY / height) * 2 - 1;
      },
      { passive: true },
    );
  }
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  start();
}

function typeInto(element, text, perChar) {
  return new Promise((resolve) => {
    const state = { count: 0 };
    animate(state, {
      count: text.length,
      duration: Math.max(1, text.length * perChar),
      ease: "linear",
      onUpdate: () => {
        element.textContent = text.slice(0, Math.round(state.count));
      },
      onComplete: resolve,
    });
  });
}

const TERMINAL_LINES = [
  { prompt: true, text: "whoami" },
  { text: "최민주 · 작고 재밌는 것을 만드는 사람" },
  { prompt: true, text: "contact --list" },
  { text: "email   cmj120333@gmail.com" },
  { text: "github  github.com/cmj1203" },
  { prompt: true, text: "" },
];

function createTerminal(output) {
  let run = 0;

  const addLine = ({ prompt }) => {
    const line = document.createElement("span");
    line.className = "ln";
    if (prompt) {
      const mark = document.createElement("span");
      mark.className = "p";
      mark.textContent = "$ ";
      line.append(mark);
    }
    const body = document.createElement("span");
    if (prompt) body.className = "cmd";
    line.append(body);
    output.append(line);
    return { line, body };
  };

  const addCaret = (line) => {
    const caret = document.createElement("span");
    caret.className = "caret small";
    line.append(caret);
  };

  const print = () => {
    output.textContent = "";
    let last = null;
    for (const entry of TERMINAL_LINES) {
      last = addLine(entry);
      last.body.textContent = entry.text;
    }
    addCaret(last.line);
  };

  const play = async () => {
    const current = ++run;
    output.textContent = "";
    await pause(420);
    let last = null;
    for (const entry of TERMINAL_LINES) {
      if (current !== run) return;
      last = addLine(entry);
      if (entry.prompt && entry.text) {
        await typeInto(last.body, entry.text, 46);
        await pause(220);
      } else {
        last.body.textContent = entry.text;
        await pause(130);
      }
    }
    if (current === run) addCaret(last.line);
  };

  const reset = () => {
    run += 1;
    output.textContent = "";
  };

  return { print, play, reset };
}

function createScenes() {
  const railButtons = $$("#rail button");
  const counter = $("#counter");
  const total = String(scenes.length).padStart(2, "0");
  const targets = scenes.map((scene) => $$("[data-r]", scene));
  const root = document.documentElement;
  const shown = scenes.map((_, index) => index === 0 && root.classList.contains("intro"));
  const playing = scenes.map(() => null);

  const setActive = (index) => {
    active = index;
    railButtons.forEach((button, n) => {
      button.classList.toggle("on", n === index);
      if (n === index) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    counter.textContent = `${String(index + 1).padStart(2, "0")}/${total}`;
  };

  const reveal = (index) => {
    if (shown[index]) return;
    shown[index] = true;
    playing[index] = animate(targets[index], {
      opacity: [0, 1],
      y: [40, 0],
      scale: [0.985, 1],
      duration: 760,
      delay: stagger(70),
      ease: "outQuart",
    });
    scenes[index].dispatchEvent(new CustomEvent("scene:in"));
  };

  const conceal = (index) => {
    if (!shown[index]) return;
    shown[index] = false;
    if (index === 0) root.classList.remove("intro");
    playing[index]?.cancel();
    for (const element of targets[index]) {
      element.style.opacity = "";
      element.style.transform = "";
    }
    scenes[index].dispatchEvent(new CustomEvent("scene:out"));
  };

  const goTo = (index) => {
    scenes[clamp(index, 0, scenes.length - 1)].scrollIntoView({ behavior: still ? "auto" : "smooth" });
  };

  const focusBand = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = scenes.indexOf(entry.target);
        setActive(index);
        if (!still) reveal(index);
      }
    },
    { rootMargin: "-45% 0px -45% 0px" },
  );

  const visibility = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle("live", entry.isIntersecting);
        if (!still && !entry.isIntersecting) conceal(scenes.indexOf(entry.target));
      }
    },
    { rootMargin: "-2px 0px -2px 0px" },
  );

  for (const scene of scenes) {
    focusBand.observe(scene);
    visibility.observe(scene);
  }
  setActive(0);

  railButtons.forEach((button, index) => {
    button.addEventListener("click", () => goTo(index));
  });
  for (const chip of $$("[data-goto]")) {
    chip.addEventListener("click", () => goTo(Number(chip.dataset.goto)));
  }

  return { goTo, current: () => active };
}

function createMap(nav) {
  const map = $("#map");
  const openButton = $("#map-open");
  const closeButton = $("#map-close");

  const open = () => {
    map.inert = false;
    map.classList.add("open");
    openButton.setAttribute("aria-expanded", "true");
    closeButton.focus();
  };

  const close = () => {
    map.classList.remove("open");
    map.inert = true;
    openButton.setAttribute("aria-expanded", "false");
    openButton.focus();
  };

  openButton.addEventListener("click", open);
  closeButton.addEventListener("click", close);
  map.addEventListener("click", (event) => {
    if (event.target === map) close();
  });
  $$("a", map).forEach((link, index) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      close();
      nav.goTo(index);
    });
  });

  return { close, isOpen: () => map.classList.contains("open") };
}

function bindKeyboard(nav, map) {
  const forward = new Set(["ArrowDown", "ArrowRight", "PageDown"]);
  const backward = new Set(["ArrowUp", "ArrowLeft", "PageUp"]);

  window.addEventListener("keydown", (event) => {
    if (map.isOpen()) {
      if (event.key === "Escape") map.close();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (forward.has(event.key)) {
      event.preventDefault();
      nav.goTo(nav.current() + 1);
    } else if (backward.has(event.key)) {
      event.preventDefault();
      nav.goTo(nav.current() - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      nav.goTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      nav.goTo(scenes.length - 1);
    }
  });
}

function bindMotion() {
  const tag = $("#tag-text");
  const tagText = tag.textContent;
  const typeTag = () => {
    tag.classList.add("on");
    tag.textContent = "";
    typeInto(tag, tagText, 34);
  };
  $("#launch").addEventListener("scene:in", typeTag);
  if (window.scrollY < window.innerHeight) typeTag();

  animate("#launch .scene-inner", {
    opacity: [1, 0],
    y: [0, -90],
    ease: "linear",
    autoplay: onScroll({ target: "#launch", enter: "top top", leave: "top bottom", sync: 0.4 }),
  });

  animate(".arm", {
    rotate: "1turn",
    duration: (_, index) => 9000 + index * 2100,
    ease: "linear",
    loop: true,
    autoplay: onScroll({ target: "#identity" }),
  });

  animate(".o-chip", {
    y: [-4, 4],
    duration: 2600,
    delay: stagger(220),
    ease: "inOutSine",
    loop: true,
    alternate: true,
    autoplay: onScroll({ target: "#identity" }),
  });
}

createSky($("#sky"));
const nav = createScenes();
const map = createMap(nav);
bindKeyboard(nav, map);

const terminal = createTerminal($("#term-out"));
if (still) {
  terminal.print();
} else {
  $("#transmit").addEventListener("scene:in", terminal.play);
  $("#transmit").addEventListener("scene:out", terminal.reset);
  bindMotion();
}

window.portfolioReady = true;
