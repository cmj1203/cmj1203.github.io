import { animate, onScroll, stagger } from "./vendor/anime.esm.min.js";

const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const random = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const scenes = $$(".scene");
let active = 0;

const LIGHT_LAYERS = [
  { count: 80, depth: 0.18, alpha: 0.8, min: 0.6, max: 1.1 },
  { count: 46, depth: 0.42, alpha: 0.75, min: 1.4, max: 2.6 },
  { count: 18, depth: 0.9, alpha: 0.45, min: 3, max: 7 },
];

const PALETTES = {
  dark: {
    blend: "lighter",
    line: "143,163,199",
    amber: "255,197,110",
    pink: "255,110,199",
    cyan: "61,220,255",
    lime: "198,255,61",
    violet: "167,139,250",
  },
  light: {
    blend: "source-over",
    line: "70,84,120",
    amber: "245,166,35",
    pink: "236,72,153",
    cyan: "14,165,233",
    lime: "101,190,40",
    violet: "139,92,246",
  },
};
const PALETTE = PALETTES[document.documentElement.dataset.theme === "light" ? "light" : "dark"];
const { amber: AMBER, pink: PINK, cyan: CYAN, lime: LIME, violet: VIOLET } = PALETTE;
const LIGHT_COLORS = [AMBER, AMBER, PINK, CYAN, LIME, VIOLET];

const WHEEL = { spokes: 12, bulbs: 36, turn: 0.04, colors: [AMBER, PINK, CYAN, LIME] };

function createGlow(rgb) {
  const sprite = document.createElement("canvas");
  sprite.width = 64;
  sprite.height = 64;
  const paint = sprite.getContext("2d");
  const gradient = paint.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, `rgba(${rgb},0.6)`);
  gradient.addColorStop(0.72, `rgba(${rgb},0.5)`);
  gradient.addColorStop(0.86, `rgba(${rgb},0.8)`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  paint.fillStyle = gradient;
  paint.fillRect(0, 0, 64, 64);
  return sprite;
}

const CLOUDS = [
  { x: 0.22, y: 0.28, radius: 330, rgb: LIME },
  { x: 0.82, y: 0.2, radius: 300, rgb: CYAN },
  { x: 0.35, y: 0.8, radius: 340, rgb: VIOLET },
  { x: 0.78, y: 0.72, radius: 290, rgb: PINK },
];

function createSky(canvas) {
  const ctx = canvas.getContext("2d");
  const cloudAlpha = CLOUDS.map(() => 0.045);
  const glows = new Map([...new Set(LIGHT_COLORS)].map((rgb) => [rgb, createGlow(rgb)]));
  let wheelAlpha = 0.26;
  let width = 0;
  let height = 0;
  let lights = [];
  let bursts = [];
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
    lights = LIGHT_LAYERS.flatMap((layer) =>
      Array.from({ length: Math.round(layer.count * density) }, () => ({
        layer,
        rgb: pick(LIGHT_COLORS),
        x: random(0, width),
        y: random(0, height),
        size: random(layer.min, layer.max),
        phase: random(0, Math.PI * 2),
        rate: random(0.3, 1.4),
      })),
    );
    bursts = [];
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

  const drawWheel = () => {
    const radius = Math.min(width, height) * 0.4;
    const cx = width * 0.84 - pointerX * 8;
    const cy = height + radius * 0.12 - pointerY * 5;
    const turn = time * WHEEL.turn;
    const cabin = radius * 0.05;
    const bulb = clamp(radius * 0.011, 2.2, 4);
    const rim = (index, count) => {
      const angle = turn + (index / count) * Math.PI * 2;
      return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    };
    wheelAlpha += ((active === 0 ? 0.26 : 0.12) - wheelAlpha) * 0.03;

    ctx.strokeStyle = `rgba(${PALETTE.line},${wheelAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.moveTo(cx + radius * 0.86, cy);
    ctx.arc(cx, cy, radius * 0.86, 0, Math.PI * 2);
    for (let index = 0; index < WHEEL.spokes; index++) {
      const [x, y] = rim(index, WHEEL.spokes);
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + cabin);
    }
    ctx.stroke();

    for (let index = 0; index < WHEEL.spokes; index++) {
      const [x, y] = rim(index, WHEEL.spokes);
      ctx.fillStyle = `rgba(${WHEEL.colors[index % WHEEL.colors.length]},${wheelAlpha * 1.5})`;
      ctx.beginPath();
      ctx.arc(x, y + cabin, cabin, 0, Math.PI);
      ctx.fill();
    }

    for (let index = 0; index < WHEEL.bulbs; index++) {
      const [x, y] = rim(index, WHEEL.bulbs);
      const blink = 0.5 + 0.5 * Math.sin(time * 2.2 - index * 0.7);
      ctx.globalAlpha = wheelAlpha * 2.6 * (0.4 + 0.6 * blink);
      ctx.drawImage(glows.get(WHEEL.colors[index % WHEEL.colors.length]), x - bulb, y - bulb, bulb * 2, bulb * 2);
    }
    ctx.globalAlpha = 1;
  };

  const drawLights = (scrollDelta) => {
    for (const light of lights) {
      const { depth, alpha } = light.layer;
      const edge = light.size + 4;
      light.y += 0.015 + depth * 0.03 - scrollDelta * depth * 0.32;
      if (light.y > height + edge) {
        light.y = -edge;
        light.x = random(0, width);
      } else if (light.y < -edge) {
        light.y = height + edge;
        light.x = random(0, width);
      }
      const x = light.x - pointerX * 18 * depth;
      const y = light.y - pointerY * 12 * depth;
      const streak = warp * depth * 46;
      const top = y - light.size - (direction < 0 ? streak : 0);
      ctx.globalAlpha = alpha * (0.55 + 0.45 * Math.sin(time * light.rate + light.phase)) * (1 - warp * 0.4);
      ctx.drawImage(glows.get(light.rgb), x - light.size, top, light.size * 2, light.size * 2 + streak);
    }
    ctx.globalAlpha = 1;
  };

  const drawFireworks = () => {
    if (Math.random() < 0.007 && bursts.length < 2) {
      const x = random(0.12, 0.88) * width;
      const y = random(0.1, 0.42) * height;
      bursts.push({
        rgb: pick(LIGHT_COLORS),
        life: 1,
        sparks: Array.from({ length: 22 }, (_, index) => {
          const angle = (index / 22) * Math.PI * 2 + random(-0.12, 0.12);
          const speed = random(1.1, 2.4);
          return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
        }),
      });
    }
    bursts = bursts.filter((burst) => burst.life > 0);
    for (const burst of bursts) {
      burst.life -= 0.014;
      ctx.strokeStyle = `rgba(${burst.rgb},${0.85 * Math.max(burst.life, 0)})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (const spark of burst.sparks) {
        spark.vx *= 0.985;
        spark.vy = spark.vy * 0.985 + 0.018;
        spark.x += spark.vx;
        spark.y += spark.vy;
        ctx.moveTo(spark.x - spark.vx * 4, spark.y - spark.vy * 4);
        ctx.lineTo(spark.x, spark.y);
      }
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
    ctx.globalCompositeOperation = PALETTE.blend;
    drawClouds();
    drawWheel();
    drawLights(animated ? scrollDelta : 0);
    if (animated) drawFireworks();
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
