"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import LoadingIntro from "./LoadingIntro";
import WayfindingScene from "./WayfindingScene";

const VIEWBOX = { width: 5442.52, height: 3061.42 };
const LETTER_SEQUENCE_PORTION = 0.8;
const CUBE_REVEAL_START = 0.55;
const CUBE_DIRECTORY_VISIBLE_PROGRESS = 0.998;
const CUBE_DIRECTORY_HIDE_PROGRESS = 0.985;
const CUBE_INTRO_ROTATION_TURNS = 0.5;
const CUBE_TURN_DURATION_MS = 520;
const CUBE_WHEEL_STEP_THRESHOLD = 18;
const CUBE_WHEEL_IDLE_MS = 180;
const PROJECT_DIRECTORY = [
  { name: "AI Now · Version A", discipline: "Branding" },
  { name: "AI Now · Version B", discipline: "Branding" },
  { name: "即梦片场", discipline: "UI&AI Coding" },
  { name: "Hōo", discipline: "Branding" },
  { name: "Holiday KV", discipline: "Visual" },
  { name: "Muning Ring", discipline: "UI&UX" },
  { name: "Other works", discipline: "Multidisciplinary" },
] as const;
const MOTION = [
  [0.3, -0.48, 0.25],
  [-0.38, 0.52, -0.32],
  [0.24, -0.34, 0.42],
  [-0.28, 0.4, -0.24],
  [0.42, 0.3, 0.32],
  [-0.36, -0.24, -0.38],
  [0.3, 0.4, 0.22],
  [-0.22, -0.42, 0.48],
  [0.38, 0.3, -0.28],
  [-0.32, 0.2, 0.34],
];

const CHOREOGRAPHY = [
  { delay: 0.02, collapse: 0.66, turns: 0.72, direction: 1, wobble: 0.12, phase: 0.1, pull: 0.42, depth: 2250, depthStart: 0.16, depthEnd: 0.53 },
  { delay: 0.09, collapse: 0.57, turns: 1.36, direction: -1, wobble: 0.2, phase: 1.4, pull: 0.58, depth: -720, depthStart: 0.05, depthEnd: 0.76 },
  { delay: 0.0, collapse: 0.72, turns: 0.48, direction: 1, wobble: 0.08, phase: 2.25, pull: 0.31, depth: 0, depthStart: 0.2, depthEnd: 0.45 },
  { delay: 0.18, collapse: 0.61, turns: 1.74, direction: -1, wobble: 0.16, phase: 3.1, pull: 0.63, depth: 1780, depthStart: 0.42, depthEnd: 0.76 },
  { delay: 0.06, collapse: 0.75, turns: 0.84, direction: 1, wobble: 0.22, phase: 4.15, pull: 0.36, depth: -1180, depthStart: 0.18, depthEnd: 0.64 },
  { delay: 0.24, collapse: 0.54, turns: 1.18, direction: -1, wobble: 0.1, phase: 5.05, pull: 0.67, depth: 610, depthStart: 0.28, depthEnd: 0.8 },
  { delay: 0.11, collapse: 0.69, turns: 1.52, direction: 1, wobble: 0.18, phase: 5.85, pull: 0.49, depth: 2860, depthStart: 0.37, depthEnd: 0.68 },
  { delay: 0.03, collapse: 0.8, turns: 0.61, direction: -1, wobble: 0.07, phase: 0.72, pull: 0.24, depth: 0, depthStart: 0.1, depthEnd: 0.5 },
  { delay: 0.15, collapse: 0.63, turns: 1.04, direction: 1, wobble: 0.14, phase: 2.78, pull: 0.56, depth: -920, depthStart: 0.08, depthEnd: 0.56 },
  { delay: 0.21, collapse: 0.59, turns: 1.62, direction: -1, wobble: 0.24, phase: 4.72, pull: 0.7, depth: 1950, depthStart: 0.49, depthEnd: 0.83 },
];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => value * value * (3 - 2 * value);
const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);
const easeInOutCubic = (value: number) => value < 0.5
  ? 4 * value * value * value
  : 1 - Math.pow(-2 * value + 2, 3) / 2;
const easeOutBack = (value: number) => {
  const c1 = 1.15;
  const c3 = c1 + 1;
  const offset = value - 1;
  return 1 + c3 * offset * offset * offset + c1 * offset * offset;
};

const CONCEPTS = [
  { label: "Assemble", style: "Retrofuturism", image: "/showcase/ainow/concept-1.png" },
  { label: "Imagine", style: "Surrealism", image: "/showcase/ainow/concept-2.png" },
  { label: "Narrate", style: "Blue-toned", image: "/showcase/ainow/concept-3.png" },
  { label: "Originate", style: "Digital Art", image: "/showcase/ainow/concept-4.png" },
  { label: "Wrap", style: "Fluid Metallic", image: "/showcase/ainow/concept-5.png" },
];
const FOCUS_IMAGE_WIDTHS = [26.9444, 22.5, 18.75, 15.4, 12.7];
const FOCUS_LABEL_SIZES = [36, 27, 24, 20];
const FOCUS_STYLE_SIZES = [33.75, 27, 21, 18];
const FOCUS_LABEL_Y = [21.43, 22.26, 22.75, 23.1];
const FOCUS_STYLE_Y = [78.99, 79.52, 80.09, 80.4];
const VIRTUAL_CONCEPT_INDICES = Array.from({ length: 31 }, (_, index) => index - 15);
// Resting distances are averaged from the left/right marks in the 1440px
// frame. The scale itself is one continuous numbered rail: every card step
// advances two marks in the same direction as the cards.
const RULER_RADII = [0, 13.85, 23.85, 31.07, 37.36, 42.29];
const RULER_VIRTUAL_INDICES = Array.from({ length: 61 }, (_, index) => index - 30);
const RULER_TICKS_PER_CARD = 2;
const CONCEPT_OVERLAP = 1.4;
const CONCEPT_HOVER_DELAY = 110;
const CONCEPT_TRANSITION_MS = 680;
const CONCEPT_REARM_DISTANCE = 10;
type ShowcaseProject = "ainow-a" | "ainow-b" | "august22" | "hoo" | "holiday" | "muning" | "other";
const SHOWCASE_PROJECT_ORDER: readonly ShowcaseProject[] = [
  "ainow-a",
  "ainow-b",
  "august22",
  "hoo",
  "holiday",
  "muning",
  "other",
];

const OTHER_WORKS = [
  {
    image: "/showcase/other-works/1.png",
    category: "活动设计",
    title: "剪映秋季投稿征集",
    className: "other-works-item--one",
  },
  {
    image: "/showcase/other-works/2.png",
    category: "Banner设计",
    title: "「爱乐之城」十周年重映AI创意挑战赛",
    className: "other-works-item--two",
  },
  {
    image: "/showcase/other-works/3.png",
    category: "周边设计",
    title: "即梦新年刮刮乐设计",
    className: "other-works-item--three",
  },
  {
    image: "/showcase/other-works/4.png",
    category: "品牌设计",
    title: "CapCut Creative Campus",
    className: "other-works-item--four",
  },
  {
    image: "/showcase/other-works/5.png",
    category: "IP设计",
    title: "AI陪伴机器人Mira",
    className: "other-works-item--five",
  },
  {
    image: "/showcase/other-works/6.png",
    category: "插画设计",
    title: "苏州桃花坞门神年画",
    className: "other-works-item--six",
  },
] as const;

function OtherWorksItem({
  work,
  index,
}: {
  work: (typeof OTHER_WORKS)[number];
  index: number;
}) {
  const { sectionRef, isVisible } = useScrollTriggeredReveal();

  return (
    <figure ref={sectionRef} className={`other-works-item ${work.className}`}>
      <img
        src={work.image}
        alt={`${work.category}：${work.title}`}
        loading={index === 0 ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={index === 0 ? "high" : "auto"}
      />
      <figcaption className={getRevealClassName(isVisible)} style={getRevealStyle(0)}>
        <h2>{work.category}</h2>
        <p>{work.title}</p>
      </figcaption>
    </figure>
  );
}

function OtherWorksGallery() {
  return (
    <section className="other-works-gallery" aria-label="Other works">
      {OTHER_WORKS.map((work, index) => (
        <OtherWorksItem key={work.image} work={work} index={index} />
      ))}
    </section>
  );
}

const HOO_IMAGES = Array.from({ length: 7 }, (_, index) => `/showcase/hoo/${index + 1}.png`);

type ProjectHeaderProject = "hoo" | "holiday" | "muning";

function ProjectHeader({ project }: { project: ProjectHeaderProject }) {
  const ariaLabel = project === "hoo"
    ? "Hōo 项目版头"
    : project === "holiday"
      ? "Dreamina 节日项目版头"
      : "Muning Ring 项目版头";

  return (
    <section className={`project-header project-header--${project}`} aria-label={ariaLabel}>
      {project === "hoo" ? (
        <img className="project-header__logo" src="/showcase/hoo/header-logo.png" alt="Hōo" />
      ) : null}
      {project === "muning" ? (
        <img className="project-header__logo" src="/showcase/muning/header-logo.png" alt="Muning" />
      ) : null}

      <h2 className="project-header__title">
        {project === "holiday" ? (
          <>
            <span>Dreamina 节日</span>
            <span>主视觉设计</span>
          </>
        ) : project === "hoo" ? "书店品牌设计" : "智能戒指UI设计"}
      </h2>

      <p className="project-header__description">
        {project === "hoo" ? (
          <>
            Hōo——呼吸，象征着最本质、最自然的生命律动<br />
            一个新的心灵栖息处，一个以“留白”与“不打扰的陪伴”为特色的书店品牌
          </>
        ) : project === "holiday" ? (
          <>
            围绕「感恩节」与「圣诞 / 跨年」两大海外节日节点<br />
            进行主视觉设计
          </>
        ) : (
          <>
            MUNING Ring，一款面向家庭健康守护的智能戒指应用<br />
            打造温暖、清晰且易于使用的健康陪伴 App
          </>
        )}
      </p>

      <dl className="project-header__meta">
        <div className="project-header__meta-group">
          <dt>项目时间</dt>
          <dd>{project === "hoo" ? "2025.5" : project === "holiday" ? "2025.12" : "2026.6"}</dd>
        </div>
        <div className="project-header__meta-group project-header__meta-group--content">
          <dt>项目内容</dt>
          <dd>
            {project === "hoo" ? (
              <>品牌设计<br />字体设计<br />包装设计</>
            ) : project === "holiday" ? (
              <>视觉设计<br />AI设计</>
            ) : (
              <>UI&amp;UX设计<br />品牌设计</>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function HooPanel({ image, number }: { image: string; number: number }) {
  const { sectionRef, isVisible } = useScrollTriggeredReveal();

  return (
    <figure ref={sectionRef} className={`hoo-panel hoo-panel--${number}`}>
      <img
        src={image}
        alt={`Hōo 品牌设计展示 ${number}`}
        loading={number === 1 ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={number === 1 ? "high" : "auto"}
      />

      {number === 2 ? (
        <figcaption className="hoo-copy hoo-audience-copy">
          <p className="hoo-audience-tempo">快节奏<br />高强度</p>
          <p className="hoo-audience-question hoo-audience-question--left">什么样的人需要「Hōo」？</p>
          <p className="hoo-audience-label hoo-audience-label--reader">文艺消费者</p>
          <p className="hoo-audience-label hoo-audience-label--youth">都市青年</p>
          <p className="hoo-audience-label hoo-audience-label--social">轻社交群体</p>
          <p className="hoo-audience-question hoo-audience-question--right">需要怎样的「Hōo」？</p>
          <p className="hoo-audience-needs">疗愈<br />感知<br />韵律<br />同频</p>
          <p className={getRevealClassName(isVisible, "hoo-audience-conclusion")} style={getRevealStyle(0)}>
            当人们对实体书店的需求逐渐从「售卖渠道」转变为一种「精神生态空间」<br />
            我们不止卖书，我们在找寻自由呼吸的感觉
          </p>
        </figcaption>
      ) : null}

      {number === 3 ? (
        <figcaption className={getRevealClassName(isVisible, "hoo-copy hoo-logo-copy")} style={getRevealStyle(0)}>
          <p className="hoo-logo-summary">将呼吸的吐纳融入中英文标志的设计，通过轻松的笔触展现品牌气质</p>
          <p className="hoo-color hoo-color--deep"><span>深呼吸蓝</span><span>40C2FF</span></p>
          <p className="hoo-color hoo-color--light"><span>浅呼吸蓝</span><span>7CD5FF</span></p>
          <p className="hoo-color hoo-color--white"><span>放空白</span><span>FFFDEA</span></p>
        </figcaption>
      ) : null}

      {number === 4 ? (
        <figcaption className={getRevealClassName(isVisible, "hoo-copy hoo-icon-copy")} style={getRevealStyle(0)}>
          延续轻松、流畅的曲线风格，构建图标导览系统
        </figcaption>
      ) : null}

      {number === 5 ? (
        <figcaption className="hoo-copy hoo-type-copy">
          <p className="hoo-type-title">品牌字体</p>
          <p className="hoo-type-signature">Hōo</p>
          <p className="hoo-type-exhale">出气口设计</p>
          <p className="hoo-type-bubble">气泡结构</p>
          <p className="hoo-type-description-title">会呼吸的字体</p>
          <p className="hoo-type-description">
            大量的气泡和出气口设计，代表了空间中的<br />
            「留白」与「不打扰的陪伴」
          </p>
          <p className="hoo-type-uppercase">大写字母</p>
          <p className="hoo-type-lowercase">小写字母</p>
        </figcaption>
      ) : null}
    </figure>
  );
}

function HooGallery() {
  return (
    <section className="hoo-gallery" aria-label="Hōo brand identity project visuals">
      <HooPanel image={HOO_IMAGES[0]} number={1} />
      <ProjectHeader project="hoo" />
      {HOO_IMAGES.slice(1).map((image, index) => {
        const number = index + 2;
        return <HooPanel key={image} image={image} number={number} />;
      })}
    </section>
  );
}

const HOLIDAY_KV_IMAGES = Array.from({ length: 9 }, (_, index) => `/showcase/holiday-kv/${index + 1}.webp`);

function useScrollTriggeredReveal<T extends HTMLElement = HTMLElement>() {
  const sectionRef = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "0px 0px -15% 0px", threshold: 0 },
    );
    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return { sectionRef, isVisible };
}

const getRevealClassName = (isVisible: boolean, className = "") =>
  `${className} showcase-reveal-item${isVisible ? " is-visible" : ""}`.trim();
const getRevealStyle = (delay: number) => ({ transitionDelay: `${delay}ms` });

function ScrollReveal({
  children,
  className = "",
  enabled = true,
}: {
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
}) {
  const { sectionRef, isVisible } = useScrollTriggeredReveal();

  return (
    <div
      ref={enabled ? sectionRef : undefined}
      className={enabled ? getRevealClassName(isVisible, className) : className}
    >
      {children}
    </div>
  );
}

function HolidayKvPanel({ image, number }: { image: string; number: number }) {
  const { sectionRef, isVisible } = useScrollTriggeredReveal();

  return (
    <figure ref={sectionRef} className={`holiday-kv-panel holiday-kv-panel--${number}`}>
      <img
        src={image}
        alt={`Holiday KV 项目展示 ${number}`}
        loading={number === 1 ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={number === 1 ? "high" : "auto"}
      />

      {number === 2 ? (
        <figcaption className="holiday-kv-copy holiday-kv-background-copy">
          <h2>项目背景</h2>
          <p className={getRevealClassName(isVisible, "holiday-kv-background-summary")} style={getRevealStyle(80)}>围绕感恩节、圣诞节，以「节日文化 × AI 创意 × 社交传播」为核心<br />激励创作者参与挑战，产出具有创意与传播力的视觉内容</p>
          <div className={getRevealClassName(isVisible, "holiday-kv-metrics")} style={getRevealStyle(160)} aria-label="项目传播数据">
            <p className="holiday-kv-metrics-kicker">从感恩节到圣诞</p>
            <p>即梦AI活动参与人数</p>
            <p>用户投稿量提升双倍</p>
            <p>社媒曝光从165万增至668万</p>
            <p>平台互动从2万增至11万</p>
          </div>
        </figcaption>
      ) : null}

      {number === 3 ? (
        <figcaption className={getRevealClassName(isVisible, "holiday-kv-copy holiday-kv-times-square")} style={getRevealStyle(0)}>设计落地美国纽约时代广场</figcaption>
      ) : null}

      {number === 4 ? (
        <figcaption className="holiday-kv-copy holiday-kv-strategy holiday-kv-strategy--dark">
          <h2>设计策略</h2>
          <div className={getRevealClassName(isVisible, "holiday-kv-strategy-body")} style={getRevealStyle(80)}>
            <div><strong>Q</strong><p>连续多个节日活动，如何避免视觉割裂？</p></div>
            <div><b>核心</b><p>以「手势」建立视觉锚点</p></div>
            <div><strong>A</strong><p>在即梦不同的活动设计中，<br />以相似的手势，塑造KV视觉风格的一致性</p></div>
          </div>
        </figcaption>
      ) : null}

      {number === 5 ? (
        <figcaption className="holiday-kv-copy holiday-kv-strategy holiday-kv-strategy--light">
          <h2>设计策略</h2>
          <div className={getRevealClassName(isVisible, "holiday-kv-strategy-body")} style={getRevealStyle(80)}>
            <div><strong>Q</strong><p>如何提升话题度？</p></div>
            <div><b>核心</b><p>用「元素重构」提升社交话题性</p></div>
            <div><strong>A</strong><p>以更具当代感、幽默感的创意切入节日文化，<br />制造更深刻的记忆点</p></div>
          </div>
        </figcaption>
      ) : null}

      {number === 6 ? (
        <figcaption className="holiday-kv-copy holiday-kv-style-title">设计风格</figcaption>
      ) : null}

      {number === 7 ? (
        <figcaption className="holiday-kv-copy holiday-kv-deliverable-labels" aria-label="设计交付物">
          <span className={getRevealClassName(isVisible)} style={getRevealStyle(0)}>获奖公示海报</span>
          <span className={getRevealClassName(isVisible)} style={getRevealStyle(80)}>KV</span>
          <span className={getRevealClassName(isVisible)} style={getRevealStyle(160)}>获奖公示名单</span>
          <span className={getRevealClassName(isVisible)} style={getRevealStyle(240)}>H5</span>
        </figcaption>
      ) : null}
    </figure>
  );
}

function HolidayKvGallery() {
  return (
    <section className="holiday-kv-gallery" aria-label="Holiday KV project visuals">
      <HolidayKvPanel image={HOLIDAY_KV_IMAGES[0]} number={1} />
      <ProjectHeader project="holiday" />
      {HOLIDAY_KV_IMAGES.slice(1).map((image, index) => (
        <HolidayKvPanel key={image} image={image} number={index + 2} />
      ))}
    </section>
  );
}

const MUNING_IMAGES = Array.from({ length: 11 }, (_, index) => `/showcase/muning/${String(index + 1).padStart(2, "0")}.png`);

function MuningRevealImage({
  src,
  alt,
  className,
  delay = 0,
  animated = true,
}: {
  src: string;
  alt: string;
  className: string;
  delay?: number;
  animated?: boolean;
}) {
  const { sectionRef, isVisible } = useScrollTriggeredReveal<HTMLImageElement>();

  return (
    <img
      ref={animated ? sectionRef : undefined}
      className={animated ? getRevealClassName(isVisible, className) : className}
      style={animated ? getRevealStyle(delay) : undefined}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}

function MuningRevealText({
  children,
  className,
  delay = 0,
  animated = false,
}: {
  children: React.ReactNode;
  className: string;
  delay?: number;
  animated?: boolean;
}) {
  const { sectionRef, isVisible } = useScrollTriggeredReveal<HTMLParagraphElement>();

  return (
    <p
      ref={animated ? sectionRef : undefined}
      className={animated ? getRevealClassName(isVisible, className) : className}
      style={animated ? getRevealStyle(delay) : undefined}
    >
      {children}
    </p>
  );
}

function MuningRevealHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return <h2 className={className}>{children}</h2>;
}

function MuningRevealBlock({
  children,
  className,
  delay = 0,
  animated = true,
}: {
  children: React.ReactNode;
  className: string;
  delay?: number;
  animated?: boolean;
}) {
  const { sectionRef, isVisible } = useScrollTriggeredReveal<HTMLDivElement>();

  return (
    <div
      ref={animated ? sectionRef : undefined}
      className={animated ? getRevealClassName(isVisible, className) : className}
      style={animated ? getRevealStyle(delay) : undefined}
    >
      {children}
    </div>
  );
}

function MuningPhoneReveal({
  src,
  alt,
  className,
  delay = 0,
}: {
  src: string;
  alt: string;
  className: string;
  delay?: number;
}) {
  const { sectionRef, isVisible } = useScrollTriggeredReveal<HTMLDivElement>();

  return (
    <div ref={sectionRef} className={`muning-phone-reveal ${className} ${isVisible ? "is-visible" : ""}`.trim()}>
      <img src={src} alt={alt} style={{ transitionDelay: `${delay}ms` }} loading="lazy" decoding="async" />
    </div>
  );
}

const MUNING_PALETTE = [
  { name: "暮影棕", role: "按钮色", hex: "HEX#3C3530" },
  { name: "晨雾白", role: "背景色", hex: "HEX#FEFAF9" },
  { name: "米灰白", role: "背景色", hex: "HEX#F4ECEB" },
  { name: "暖阳橙", role: "强调色", hex: "HEX#E2A168" },
  { name: "新芽绿", role: "强调色", hex: "HEX#C9E7CF" },
] as const;

function MuningPanel({ number }: { number: number }) {
  const image = MUNING_IMAGES[number - 1];

  if (number === 4) {
    return (
      <figure className="muning-panel muning-panel--4 muning-logo-phone-panel">
        <img
          className="muning-panel-base"
          src={image}
          alt="Muning Ring logo and app mockup background"
          loading="lazy"
          decoding="async"
        />
        <MuningPhoneReveal
          src="/showcase/muning/phone.png"
          alt="Muning app home screen mockup"
          className="muning-logo-phone"
        />
        <div className="muning-logo-phone-copy-anchor">
          <MuningRevealText className="muning-logo-phone-copy" delay={80} animated>
            <span className="muning-logo-phone-copy-line muning-logo-phone-copy-line--first">以温暖流动的环形</span>
            <span className="muning-logo-phone-copy-line muning-logo-phone-copy-line--second">传递陪伴、连接与无限可能</span>
          </MuningRevealText>
        </div>
      </figure>
    );
  }

  return (
    <figure className={`muning-panel muning-panel--${number}`}>
      <img
        className="muning-panel-base"
        src={image}
        alt={`Muning Ring project visual ${number}`}
        loading={number === 1 ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={number === 1 ? "high" : "auto"}
      />

      {number === 2 ? (
        <>
          <MuningRevealHeading className="muning-project-heading">项目背景</MuningRevealHeading>
          <MuningRevealImage src="/showcase/muning/about.png" alt="About" className="muning-about-title" />
          <MuningRevealText className="muning-about-copy">
            Muning Ring是一款主要面向家庭健康的AI智能戒指，<br />
            让家人能够更安心地了解彼此的日常<br />
            状态与健康变化
          </MuningRevealText>
          <MuningRevealImage src="/showcase/muning/concept.png" alt="Concept" className="muning-concept-title" />
          <MuningRevealText className="muning-concept-copy">
            打造一款温暖、清晰且易于使用的健康陪伴 App，集<br />
            中查看家庭成员的活动、睡眠与关键健康数据，并在<br />
            异常发生时及时获得提醒、沟通与照护支持
          </MuningRevealText>
        </>
      ) : null}

      {number === 3 ? (
        <>
          <MuningRevealImage src="/showcase/muning/logo-title.png" alt="Logo" className="muning-logo-title" />
          <MuningRevealText className="muning-logo-dark-copy muning-logo-dark-copy--dance">
            马蒂斯《舞蹈》<br />
            <span>象征连接、循环、生命力与陪伴感</span>
          </MuningRevealText>
          <MuningRevealText className="muning-logo-dark-plus">+</MuningRevealText>
          <MuningRevealText className="muning-logo-dark-copy muning-logo-dark-copy--ripple">
            水波纹<br />
            <span>传达自然、流动与疗愈</span>
          </MuningRevealText>
        </>
      ) : null}

      {number === 5 ? (
        <>
          <MuningRevealHeading className="muning-color-heading">色彩系统</MuningRevealHeading>
          <MuningRevealText className="muning-color-copy">
            以柔和的中性色建立安静、可靠的阅读氛围，降低健康信息带来的紧张感。<br />
            暖阳与新芽作为点缀色，用于传递关怀、活力与安心的健康状态。
          </MuningRevealText>
          <div className="muning-palette-overlay" aria-label="Muning Ring color system">
            {MUNING_PALETTE.map((color, index) => (
              <MuningRevealBlock key={color.name} className={`muning-palette-card muning-palette-card--${index + 1}`} animated={false}>
                <strong>{color.name}</strong>
                <span>{color.role}</span>
                <small>{color.hex}</small>
              </MuningRevealBlock>
            ))}
          </div>
        </>
      ) : null}

      {number === 6 ? (
        <>
          <MuningRevealHeading className="muning-avatar-heading">头像设计</MuningRevealHeading>
          <MuningRevealText className="muning-avatar-copy">
            趣味化的头像展示<br />
            满足不同身份、不同年龄
          </MuningRevealText>
        </>
      ) : null}

      {number === 7 ? (
        <>
          <MuningRevealHeading className="muning-type-heading">字体系统</MuningRevealHeading>
          <div className="muning-type-primary">
            <strong>主体字</strong>
            <b>SF Pro</b>
            <MuningRevealText className="muning-type-primary-copy">
              建立清晰、可靠且适合健康数据阅读的界面基础，<br />让信息层级和操作体验更自然。
            </MuningRevealText>
          </div>
          <div className="muning-type-display">
            <strong>特殊字体</strong>
            <MuningRevealImage src="/showcase/muning/playfair-display-title.png" alt="Playfair Display" className="muning-playfair-title" animated={false} />
            <MuningRevealText className="muning-type-display-copy">
              用于家人姓名、情感化标题和关键状态，让理性的健康监测中保留温度与亲密感，平衡了产品的科技属性与家庭守护应有的人文关怀。
            </MuningRevealText>
          </div>
        </>
      ) : null}

      {number === 8 ? (
        <>
          <MuningRevealImage src="/showcase/muning/onboarding-title.png" alt="Onboarding" className="muning-onboarding-title" animated={false} />
          <MuningRevealText className="muning-onboarding-copy">
            以轻量、分步的方式帮助用户完成戒指配对，<br />
            让复杂的健康守护关系从第一次使用就<br />
            清晰而有温度。
          </MuningRevealText>
          <MuningRevealImage src="/showcase/muning/homepage-title.png" alt="Homepage" className="muning-homepage-title" animated={false} />
          <MuningRevealText className="muning-homepage-copy">
            区别于其他智能戒指产品，将Muning家庭页面作为首页<br /><br />
            最关心的始终是家人的当下状态<br />
            打开应用即可快速了解每个人是否安好
          </MuningRevealText>
          <MuningRevealImage src="/showcase/muning/family-title.png" alt="Family" className="muning-family-title" animated={false} />
          <MuningRevealText className="muning-family-copy">是Muning Ring的核心</MuningRevealText>
        </>
      ) : null}

      {number === 9 ? (
        <>
          <div className="muning-alerts-header">
            <MuningRevealImage src="/showcase/muning/alerts-title.png" alt="Alerts" className="muning-alerts-title" animated={false} />
            <MuningRevealText className="muning-alerts-copy">为个人和家人设置健康提醒，查看完成情况</MuningRevealText>
          </div>
          <div className="muning-alert-labels" aria-label="Alerts screens">
            {["Alerts", "设置提醒", "详情", "详情-讯息", "回收箱"].map((label, index) => (
              <MuningRevealBlock key={label} className={`muning-alert-label muning-alert-label--${index + 1}`} animated={false}>
                <span>{label}</span>
              </MuningRevealBlock>
            ))}
          </div>
        </>
      ) : null}

      {number === 10 ? (
        <>
          <MuningRevealImage src="/showcase/muning/health-data-title.png" alt="Health Data" className="muning-health-title" animated={false} />
          <MuningRevealText className="muning-health-copy">详细、个性化的身体数据反馈每日的健康情况</MuningRevealText>
          <MuningPhoneReveal
            src="/showcase/muning/phone2.png"
            alt="Muning health data phone mockups"
            className="muning-health-phone"
          />
        </>
      ) : null}
    </figure>
  );
}

function MuningGallery() {
  return (
    <section className="muning-gallery" aria-label="Muning Ring project visuals">
      <MuningPanel number={1} />
      <ProjectHeader project="muning" />
      {MUNING_IMAGES.slice(1).map((_, index) => <MuningPanel key={index + 2} number={index + 2} />)}
    </section>
  );
}

const PROJECT_TWO_BUBBLES = [
  { className: "is-seen", text: "希望我的作品可以「被看见」" },
  { className: "is-presented", text: "最新的、最好的片子希望得到呈现" },
  { className: "is-traditional", text: "传统影视从业者：" },
  { className: "is-ranked", text: "希望我的片子能登上榜单" },
  { className: "is-personal", text: "个人AI创作者：" },
  { className: "is-platform", text: "我很需要一个可以当作作品名片的展示平台" },
  { className: "is-trends", text: "想看到行业里的爆款与趋势" },
  { className: "is-professional", text: "专业AI创作者：" },
  { className: "is-collaboration", text: "能获得一些商业合作最好" },
  { className: "is-explore", text: "想看看大家都在做什么样的" },
] as const;

const PROJECT_TWO_SOLUTION_LABELS = ["表达展示", "行业洞悉", "创意激发"];
const PROJECT_TWO_SOLUTION_CAPTIONS = [
  "个人作品展示 ——「被看见」",
  "行业标杆集合 ——「找答案」",
  "作品灵感库 ——「去探索」",
];

function ProjectTwoStory() {
  const { sectionRef: storyRef, isVisible } = useScrollTriggeredReveal();

  return (
    <section ref={storyRef} className="showcase-project-two-story" aria-label="Project 2 story">
      <div className="showcase-project-two-story-canvas">
        <img
          className="showcase-project-two-story-background"
          src="/showcase/project-two-02.png"
          alt=""
          aria-hidden="true"
        />

        <img
          className={getRevealClassName(isVisible, "project-two-story-layer project-two-question-title")}
          src="/showcase/project-two-question.png"
          alt="Question"
          style={getRevealStyle(0)}
        />
        <p className={getRevealClassName(isVisible, "project-two-story-subtitle project-two-question-subtitle")} style={getRevealStyle(80)}>
          AI创作者需要的是什么样的平台？
        </p>

        <img
          className="project-two-story-layer project-two-bubbles"
          src="/showcase/project-two-bubbles.png"
          alt=""
          aria-hidden="true"
        />
        <div className="project-two-bubble-copy-layer" aria-label="创作者的需求">
          {PROJECT_TWO_BUBBLES.map((bubble) => (
            <div
              key={bubble.className}
              className={`project-two-bubble-copy ${bubble.className}`}
            >
              <span>{bubble.text}</span>
            </div>
          ))}
        </div>

        <img
          className={getRevealClassName(isVisible, "project-two-story-layer project-two-solution-title")}
          src="/showcase/project-two-solution.png"
          alt="Solution"
          style={getRevealStyle(620)}
        />
        <p className={getRevealClassName(isVisible, "project-two-story-subtitle project-two-solution-subtitle")} style={getRevealStyle(700)}>
          如何满足创作者的核心诉求？
        </p>

        <img
          className={getRevealClassName(isVisible, "project-two-story-layer project-two-solutions")}
          src="/showcase/project-two-solutions.png"
          alt="三个创作者平台方向展示"
          style={getRevealStyle(780)}
        />
        <div className="project-two-solution-labels" aria-label="三个解决方向">
          {PROJECT_TWO_SOLUTION_LABELS.map((label, index) => (
            <span key={label} className={getRevealClassName(isVisible)} style={getRevealStyle(860 + index * 50)}>{label}</span>
          ))}
        </div>
        <div className="project-two-solution-captions">
          {PROJECT_TWO_SOLUTION_CAPTIONS.map((caption, index) => (
            <span key={caption} className={getRevealClassName(isVisible)} style={getRevealStyle(1000 + index * 50)}>{caption}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectTwoExploration() {
  const { sectionRef, isVisible } = useScrollTriggeredReveal();

  return (
    <section ref={sectionRef} className="project-two-exploration" aria-labelledby="project-two-exploration-title">
      <img
        className="project-two-exploration-background"
        src="/showcase/project-two-03.png"
        alt="日梦片场从露天观影会、电影院到巨幕荧屏的设计探索"
        loading="lazy"
        decoding="async"
      />
      <h2 id="project-two-exploration-title">设计探索</h2>

      <article className="project-two-exploration-note is-open-air">
        <img className={getRevealClassName(isVisible)} style={getRevealStyle(100)} src="/showcase/exploration-1.png" alt="" aria-hidden="true" />
        <div className={getRevealClassName(isVisible)} style={getRevealStyle(180)}>
          <h3>露天观影会</h3>
          <p>意象新颖、交互有趣<br />但花苞场景通用性弱</p>
        </div>
      </article>

      <article className="project-two-exploration-note is-cinema">
        <img className={getRevealClassName(isVisible)} style={getRevealStyle(260)} src="/showcase/exploration-2.png" alt="" aria-hidden="true" />
        <div className={getRevealClassName(isVisible)} style={getRevealStyle(340)}>
          <h3>电影院</h3>
          <p>有观影氛围<br />但太传统、不够新</p>
        </div>
      </article>

      <article className="project-two-exploration-note is-screen">
        <img className={getRevealClassName(isVisible)} style={getRevealStyle(420)} src="/showcase/exploration-3.png" alt="" aria-hidden="true" />
        <div className={getRevealClassName(isVisible)} style={getRevealStyle(500)}>
          <h3>巨幕荧屏</h3>
          <p>沉浸感强<br />基于此继续延伸</p>
        </div>
      </article>
    </section>
  );
}

function ProjectTwoInterfaceMap() {
  const { sectionRef, isVisible } = useScrollTriggeredReveal();

  return (
    <section ref={sectionRef} className="project-two-interface-map" aria-label="日梦片场首页、个人页与详情页设计">
      <img
        className="project-two-interface-map-background"
        src="/showcase/project-two-04.png"
        alt="日梦片场项目移动端与网页端展示"
        loading="lazy"
        decoding="async"
      />

      <article className="project-two-interface-note is-homepage">
        <img className={getRevealClassName(isVisible)} style={getRevealStyle(0)} src="/showcase/project-two-homepage.png" alt="Homepage" />
        <p className={getRevealClassName(isVisible)} style={getRevealStyle(80)}>线下的影院是集体造梦的场所<br />线上的平台是创作者深度共鸣的空间，首页设计融合两者特点</p>
      </article>

      <article className="project-two-interface-note is-profile">
        <img className={getRevealClassName(isVisible)} style={getRevealStyle(160)} src="/showcase/project-two-profile.png" alt="Profile" />
        <p className={getRevealClassName(isVisible)} style={getRevealStyle(240)}>个人页</p>
      </article>

      <article className="project-two-interface-note is-detail-page">
        <img className={getRevealClassName(isVisible)} style={getRevealStyle(320)} src="/showcase/project-two-detail-page.png" alt="Detail page" />
        <p className={getRevealClassName(isVisible)} style={getRevealStyle(400)}>详情页</p>
      </article>

      <article className="project-two-hover-zone is-media">
        <button type="button" className="project-two-interface-hotspot" aria-label="媒介：巨幕荧屏。无法替代的氛围、情感厚度" />
        <div className="project-two-hover-cursor"><ProjectTwoHoverCursor /></div>
        <p className="project-two-hover-card">媒介：巨幕荧屏<br />无法替代的氛围、情感厚度</p>
      </article>

      <article className="project-two-hover-zone is-curated">
        <button type="button" className="project-two-interface-hotspot" aria-label="策展精选廊。聚合行业标杆影片" />
        <div className="project-two-hover-cursor"><ProjectTwoHoverCursor /></div>
        <p className="project-two-hover-card">策展精选廊<br />聚合行业标杆影片</p>
      </article>

      <article className="project-two-hover-zone is-film-wall">
        <button type="button" className="project-two-interface-hotspot" aria-label="动态胶片墙。每个胶片都是一个故事窗口" />
        <div className="project-two-hover-cursor"><ProjectTwoHoverCursor /></div>
        <p className="project-two-hover-card">动态胶片墙<br />每个胶片都是一个故事窗口</p>
      </article>
    </section>
  );
}

function ProjectTwoHoverCursor() {
  return (
    <svg viewBox="0 0 35 37" fill="none" aria-hidden="true">
      <path
        d="M7.80166 6.22067C7.45896 4.58274 9.21238 3.30881 10.6642 4.14089L26.1084 12.9921C27.5805 13.8358 27.336 16.0295 25.7143 16.5284L19.0241 18.5863C18.5893 18.7201 18.2154 19.0024 17.9677 19.384L14.9239 24.0727C13.9814 25.5246 11.7535 25.1082 11.399 23.4139L7.80166 6.22067Z"
        fill="#FFF1C0"
        fillOpacity="0.2"
      />
    </svg>
  );
}

const conceptDataIndex = (virtualIndex: number) => (virtualIndex % CONCEPTS.length + CONCEPTS.length) % CONCEPTS.length;
const rulerPosition = (relativeIndex: number) => {
  const distance = Math.abs(relativeIndex);
  const lastDefinedIndex = RULER_RADII.length - 1;
  const radius = distance <= lastDefinedIndex
    ? RULER_RADII[distance]
    : RULER_RADII[lastDefinedIndex] + (distance - lastDefinedIndex) * 4.9;
  return 50 + Math.sign(relativeIndex) * radius;
};
const conceptWidthAtDistance = (distance: number) => FOCUS_IMAGE_WIDTHS[Math.min(Math.abs(distance), FOCUS_IMAGE_WIDTHS.length - 1)];
const conceptSlotPosition = (virtualIndex: number, activeIndex: number) => {
  const delta = virtualIndex - activeIndex;
  let position = 50;
  const direction = Math.sign(delta);
  for (let step = 0; step < Math.abs(delta); step += 1) {
    const currentWidth = conceptWidthAtDistance(step);
    const nextWidth = conceptWidthAtDistance(step + 1);
    position += direction * ((currentWidth + nextWidth) / 2 - CONCEPT_OVERLAP);
  }
  return position;
};
const nearestConceptIndex = (dataIndex: number, currentIndex: number) => {
  const sameCycle = Math.round((currentIndex - dataIndex) / CONCEPTS.length) * CONCEPTS.length + dataIndex;
  return [sameCycle - CONCEPTS.length, sameCycle, sameCycle + CONCEPTS.length]
    .reduce((nearest, candidate) => Math.abs(candidate - currentIndex) < Math.abs(nearest - currentIndex) ? candidate : nearest, sameCycle);
};

export default function Home() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const showcaseRef = useRef<HTMLElement>(null);
  const [loadingVisible, setLoadingVisible] = useState(true);
  const [metalLettersReady, setMetalLettersReady] = useState(false);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [cubeDirectoryVisible, setCubeDirectoryVisible] = useState(false);
  const [activeCubeProjectIndex, setActiveCubeProjectIndex] = useState(0);
  const [showcaseProject, setShowcaseProject] = useState<ShowcaseProject>("ainow-a");
  const [activeConceptIndex, setActiveConceptIndex] = useState(2);
  const [conceptRecentering, setConceptRecentering] = useState(false);
  const showcaseOpenRef = useRef(false);
  const showcaseHeroVideoRef = useRef<HTMLVideoElement>(null);
  const showcaseProjectVideoRef = useRef<HTMLVideoElement>(null);
  const resumeWebglRef = useRef<(() => void) | null>(null);
  const cubeProjectSelectRef = useRef<((index: number) => void) | null>(null);
  const introBurstStartedAt = useRef<number | null>(null);
  const activeConceptRef = useRef(2);
  const conceptHoverTimer = useRef<number | null>(null);
  const conceptMotionTimer = useRef<number | null>(null);
  const conceptRecenterFrame = useRef<number | null>(null);
  const conceptUnlockFrame = useRef<number | null>(null);
  const conceptMotionLocked = useRef(false);
  const conceptPointerInside = useRef(false);
  const conceptHoverTarget = useRef<number | null>(null);
  const conceptHoverArmed = useRef(true);
  const conceptPointerPosition = useRef({ x: 0, y: 0 });
  const conceptLockPosition = useRef({ x: 0, y: 0 });
  const pageScrollBeforeShowcase = useRef(0);
  const openShowcase = useCallback((project: ShowcaseProject = "ainow-a") => {
    pageScrollBeforeShowcase.current = window.scrollY;
    setShowcaseProject(project);
    setShowcaseOpen(true);
  }, []);
  const closeShowcase = useCallback(() => {
    setShowcaseOpen(false);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: pageScrollBeforeShowcase.current, behavior: "auto" });
    });
  }, []);
  const isAinowProject = showcaseProject === "ainow-a" || showcaseProject === "ainow-b";
  const isHackathonVersion = showcaseProject === "ainow-a";
  const finishLoading = useCallback(() => setLoadingVisible(false), []);
  const startMetalBurst = useCallback(() => {
    introBurstStartedAt.current = performance.now();
    resumeWebglRef.current?.();
  }, []);

  useEffect(() => () => {
    if (conceptHoverTimer.current !== null) window.clearTimeout(conceptHoverTimer.current);
    if (conceptMotionTimer.current !== null) window.clearTimeout(conceptMotionTimer.current);
    if (conceptRecenterFrame.current !== null) window.cancelAnimationFrame(conceptRecenterFrame.current);
    if (conceptUnlockFrame.current !== null) window.cancelAnimationFrame(conceptUnlockFrame.current);
  }, []);

  useEffect(() => {
    if (showcaseOpen) window.scrollTo({ top: 0, behavior: "auto" });
  }, [showcaseOpen]);

  useEffect(() => {
    const video = showcaseProjectVideoRef.current;
    if (!video || showcaseProject !== "august22") return;
    if (!showcaseOpen) {
      video.pause();
      video.currentTime = 0;
      return;
    }
    video.currentTime = 0;
    video.play().catch(() => undefined);
  }, [showcaseOpen, showcaseProject]);

  useEffect(() => {
    const video = showcaseHeroVideoRef.current;
    if (!video || !isHackathonVersion) return;
    if (!showcaseOpen) {
      video.pause();
      video.currentTime = 0;
      return;
    }
    video.currentTime = 0;
    video.play().catch(() => undefined);
  }, [showcaseOpen, isHackathonVersion]);

  useEffect(() => {
    showcaseOpenRef.current = showcaseOpen;
    if (!showcaseOpen) resumeWebglRef.current?.();
  }, [showcaseOpen]);

  useEffect(() => {
    const section = sectionRef.current;
    const host = canvasRef.current;
    if (!section || !host) return;

    setMetalLettersReady(false);
    introBurstStartedAt.current = null;
    let disposed = false;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 1, 10000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // The composition is a decorative full-screen scene; capping the backing
    // buffer keeps high-DPI displays from turning every wheel frame into a
    // multi-million-pixel render.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0xf9f9f7, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
    scene.environment = environment;

    const key = new THREE.RectAreaLight(0xffffff, 8, 2800, 1500);
    key.position.set(-900, 900, 1900);
    key.lookAt(0, 0, 0);
    scene.add(key);
    const rim = new THREE.RectAreaLight(0xdde9ff, 5, 2100, 900);
    rim.position.set(1450, 500, 1300);
    rim.lookAt(0, 0, 0);
    scene.add(rim);
    const fill = new THREE.RectAreaLight(0xffffff, 3, 2600, 1100);
    fill.position.set(-300, -1100, 850);
    fill.lookAt(0, 0, 0);
    scene.add(fill);
    const sweepLight = new THREE.PointLight(0xf4fbff, 0, 1050, 2);
    scene.add(sweepLight);

    const lettersRoot = new THREE.Group();
    lettersRoot.position.set(-VIEWBOX.width / 2, VIEWBOX.height / 2, 0);
    lettersRoot.scale.y = -1;
    scene.add(lettersRoot);

    const anchors: Array<{ group: THREE.Group; base: THREE.Vector3 }> = [];
    const interactiveMeshes: THREE.Mesh[] = [];
    const hoverStrength = new Float32Array(CHOREOGRAPHY.length);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(2, 2);
    let pointerNeedsUpdate = true;
    const hoverPoint = new THREE.Vector3();
    const hoverPlane = new THREE.Plane();
    const anchorWorld = new THREE.Vector3();
    const projectedAnchor = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();
    const compositionCenter = new THREE.Vector3(VIEWBOX.width / 2, VIEWBOX.height / 2, 0);
    const sweepPosition = new THREE.Vector3();
    let activeHoverIndex = -1;
    let previousHoverIndex = -1;
    let sweepIndex = -1;
    let sweepStartedAt = 0;
    const faceMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd9ddde,
      metalness: 1,
      roughness: 0.17,
      clearcoat: 0.22,
      clearcoatRoughness: 0.12,
    });
    const edgeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x7d8588,
      metalness: 1,
      roughness: 0.25,
    });

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(11, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x080808, transparent: true, opacity: 0 }),
    );
    dot.position.set(0, 0, 15);
    scene.add(dot);
    const CUBE_FACE_WIDTH = 688;
    const CUBE_FACE_HEIGHT = 387;
    const CUBE_DEPTH = CUBE_FACE_HEIGHT;
    const CUBE_VIEW_TILT_X = THREE.MathUtils.degToRad(23);
    const CUBE_VIEW_TILT_Y = THREE.MathUtils.degToRad(-16);
    const CUBE_VIEW_ROLL = THREE.MathUtils.degToRad(1);
    const CUBE_FACE_REST_OFFSET = THREE.MathUtils.degToRad(-2);
    const CUBE_FINAL_SCALE = 0.9;
    const CUBE_POSITION_X = 0.015;
    const CUBE_POSITION_Y = 0.08;
    const CUBE_TEXTURE_HEIGHT_RATIO = CUBE_FACE_HEIGHT / CUBE_FACE_WIDTH;
    const CUBE_CONTENT_HOVER_SCALE = 1.03;
    const CUBE_CONTENT_HOVER_DURATION_MS = 200;
    const fitSquareTextureToWideFace = (texture: THREE.Texture) => {
      texture.repeat.set(1, CUBE_TEXTURE_HEIGHT_RATIO);
      texture.offset.set(0, (1 - CUBE_TEXTURE_HEIGHT_RATIO) / 2);
      texture.needsUpdate = true;
    };
    const createCubeVideo = (source: string) => {
      const video = document.createElement("video");
      video.src = source;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.play().catch(() => undefined);
      const texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      fitSquareTextureToWideFace(texture);
      return { video, texture };
    };
    const rotateCubeTexture = (texture: THREE.Texture, preserveCenteredCrop = false) => {
      if (preserveCenteredCrop) texture.offset.y = 0;
      texture.center.set(0.5, 0.5);
      texture.rotation = Math.PI;
      texture.needsUpdate = true;
    };
    const createCubeContentMaterial = (parameters: THREE.MeshBasicMaterialParameters) => {
      const material = new THREE.MeshBasicMaterial(parameters);
      material.onBeforeCompile = (shader: {
        uniforms: Record<string, { value: unknown }>;
        vertexShader: string;
      }) => {
        shader.uniforms.uCubeContentHoverScale = { value: 1 };
        material.userData.cubeContentHoverScaleUniform = shader.uniforms.uCubeContentHoverScale;
        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <uv_pars_vertex>",
            "#include <uv_pars_vertex>\nuniform float uCubeContentHoverScale;",
          )
          .replace(
            "#include <uv_vertex>",
            "#include <uv_vertex>\n#ifdef USE_MAP\n\tvMapUv = vec2(0.5) + (vMapUv - vec2(0.5)) / uCubeContentHoverScale;\n#endif",
          );
      };
      material.customProgramCacheKey = () => "cube-content-hover-scale-v1";
      return material;
    };
    const firstCubeVideo = createCubeVideo("/cube/video-1-cube.mp4");
    const secondCubeVideo = createCubeVideo("/cube/video-2.mp4");
    // Projects 3 and 7 enter through the back face, whose UVs are upside down
    // from the front-facing presentation.
    rotateCubeTexture(secondCubeVideo.texture, true);
    const firstFacePosterTexture = new THREE.TextureLoader().load("/cube/face-1-poster.webp");
    firstFacePosterTexture.colorSpace = THREE.SRGBColorSpace;
    fitSquareTextureToWideFace(firstFacePosterTexture);
    // The cube only needs a 2x display-resolution copy; the full-resolution PNG
    // remains the Version B project cover in the showcase.
    const versionBCoverTexture = new THREE.TextureLoader().load("/showcase/ainow/version-b-cover-cube.webp");
    versionBCoverTexture.colorSpace = THREE.SRGBColorSpace;
    // Projects after the two AI NOW entries use wide 16:9 cover art, so keep the full texture instead
    // of applying the square-cover crop used by the first two cube faces.
    const thirdFaceTexture = new THREE.TextureLoader().load("/cube/face-3-cube.webp");
    thirdFaceTexture.colorSpace = THREE.SRGBColorSpace;
    const fourthFaceTexture = new THREE.TextureLoader().load("/cube/face-4-cube.webp");
    fourthFaceTexture.colorSpace = THREE.SRGBColorSpace;
    const fifthFaceTexture = new THREE.TextureLoader().load("/cube/face-5-cube.webp");
    fifthFaceTexture.colorSpace = THREE.SRGBColorSpace;
    const sixthFaceTexture = new THREE.TextureLoader().load("/cube/face-6-cube.webp");
    sixthFaceTexture.colorSpace = THREE.SRGBColorSpace;
    rotateCubeTexture(sixthFaceTexture);
    const cubeBlackMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
    });
    const firstVideoMaterial = createCubeContentMaterial({ map: firstFacePosterTexture, transparent: true, opacity: 0, toneMapped: false });
    const versionBCoverMaterial = createCubeContentMaterial({ map: versionBCoverTexture, transparent: true, opacity: 0, toneMapped: false });
    const secondVideoMaterial = createCubeContentMaterial({ map: secondCubeVideo.texture, transparent: true, opacity: 0, toneMapped: false });
    const thirdImageMaterial = createCubeContentMaterial({ map: thirdFaceTexture, transparent: true, opacity: 0, toneMapped: false });
    const fourthImageMaterial = createCubeContentMaterial({ map: fourthFaceTexture, transparent: true, opacity: 0, toneMapped: false });
    const fifthImageMaterial = createCubeContentMaterial({ map: fifthFaceTexture, transparent: true, opacity: 0, toneMapped: false });
    const sixthImageMaterial = createCubeContentMaterial({ map: sixthFaceTexture, transparent: true, opacity: 0, toneMapped: false });
    const cubeContentMaterials = [
      firstVideoMaterial,
      versionBCoverMaterial,
      secondVideoMaterial,
      thirdImageMaterial,
      fourthImageMaterial,
      fifthImageMaterial,
      sixthImageMaterial,
    ] as const;
    const cubeMaterials = [cubeBlackMaterial, cubeBlackMaterial, secondVideoMaterial, fourthImageMaterial, firstVideoMaterial, thirdImageMaterial];
    const canonicalCubeMaterials = cubeMaterials.slice();
    // Each directory entry maps to the material slot that faces the camera at
    // its turn. The AI NOW entries use separate covers for Versions A and B.
    const cubeProjectMaterialSlots = [4, 2, 5, 3, 4, 2, 5] as const;
    const cubeProjectMaterials = [
      firstVideoMaterial,
      versionBCoverMaterial,
      secondVideoMaterial,
      thirdImageMaterial,
      fourthImageMaterial,
      fifthImageMaterial,
      sixthImageMaterial,
    ] as const;
    const cubeView = new THREE.Group();
    cubeView.rotation.set(CUBE_VIEW_TILT_X, CUBE_VIEW_TILT_Y, CUBE_VIEW_ROLL);
    scene.add(cubeView);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(CUBE_FACE_WIDTH, CUBE_FACE_HEIGHT, CUBE_DEPTH), cubeMaterials);
    cube.scale.setScalar(0.01);
    cubeView.add(cube);
    const getCubeMaterialAt = (materialIndex: number) => {
      const material = cube.material;
      return Array.isArray(material)
        ? material[materialIndex]
        : materialIndex === 0
          ? material
          : undefined;
    };

    const revealFirstVideo = () => {
      firstVideoMaterial.map = firstCubeVideo.texture;
      firstVideoMaterial.needsUpdate = true;
      scheduleDraw();
    };
    if (firstCubeVideo.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      revealFirstVideo();
    } else {
      firstCubeVideo.video.addEventListener("loadeddata", revealFirstVideo, { once: true });
    }

    const restingRotationMatrix = new THREE.Matrix4()
      .makeRotationFromEuler(new THREE.Euler(CUBE_VIEW_TILT_X, CUBE_VIEW_TILT_Y, CUBE_VIEW_ROLL))
      .multiply(new THREE.Matrix4().makeRotationX(CUBE_FACE_REST_OFFSET));
    const restingRotationElements = restingRotationMatrix.elements;
    const restingBoundsWidth =
      Math.abs(restingRotationElements[0]) * CUBE_FACE_WIDTH +
      Math.abs(restingRotationElements[4]) * CUBE_FACE_HEIGHT +
      Math.abs(restingRotationElements[8]) * CUBE_DEPTH;
    const restingBoundsHeight =
      Math.abs(restingRotationElements[1]) * CUBE_FACE_WIDTH +
      Math.abs(restingRotationElements[5]) * CUBE_FACE_HEIGHT +
      Math.abs(restingRotationElements[9]) * CUBE_DEPTH;

    let baseCameraZ = 0;
    let maxCubeScale = 1;

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      const aspect = width / height;
      const compositionAspect = VIEWBOX.width / VIEWBOX.height;
      const visibleHeight = aspect > compositionAspect ? VIEWBOX.width / aspect : VIEWBOX.height;
      const visibleWidth = visibleHeight * aspect;
      camera.aspect = aspect;
      baseCameraZ = visibleHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      maxCubeScale = Math.min(
        (visibleHeight * 0.88) / restingBoundsHeight,
        (visibleWidth * 0.76) / restingBoundsWidth,
      );
      cubeView.position.set(
        visibleWidth * CUBE_POSITION_X,
        visibleHeight * CUBE_POSITION_Y,
        0,
      );
      camera.position.z = baseCameraZ;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const render = () => renderer.render(scene, camera);

    fetch("/letters/composition.svg")
      .then((response) => response.text())
      .then((source) => {
        if (disposed) return;
        const parsed = new SVGLoader().parse(source);
        parsed.paths.forEach((path, index) => {
          const shapes = path.toShapes(true);
          const geometry = new THREE.ExtrudeGeometry(shapes, {
            depth: 28,
            bevelEnabled: true,
            bevelThickness: 4.2,
            bevelSize: 3.4,
            bevelSegments: 8,
            curveSegments: 24,
          });
          geometry.computeBoundingBox();
          const bounds = geometry.boundingBox;
          if (!bounds) return;
          const center = bounds.getCenter(new THREE.Vector3());
          geometry.translate(-center.x, -center.y, -14);

          const mesh = new THREE.Mesh(geometry, [faceMaterial, edgeMaterial]);
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          const anchor = new THREE.Group();
          anchor.position.set(center.x, center.y, 0);
          anchor.add(mesh);
          lettersRoot.add(anchor);
          anchors.push({ group: anchor, base: anchor.position.clone() });
          mesh.userData.anchorIndex = index;
          interactiveMeshes.push(mesh);
        });
        resize();
        render();
        setMetalLettersReady(true);
      });

    let scrollProgress = 0;
    let cubeTarget = 0;
    let cubeFaceIndex = 0;
    let cubeFaceRotation = CUBE_FACE_REST_OFFSET;
    let cubeTurning = false;
    let cubeTurnFromRotation = CUBE_FACE_REST_OFFSET;
    let cubeTurnToRotation = CUBE_FACE_REST_OFFSET;
    let cubeTurnStartedAt = 0;
    let cubeTurnDuration = CUBE_TURN_DURATION_MS;
    let queuedCubeFaceIndex: number | null = null;
    let cubeWheelAccumulator = 0;
    let cubeWheelAccumulatorAt = 0;
    let cubeWheelGestureLocked = false;
    let renderedProgress = 0;
    let progressVelocity = 0;
    let previousFrameAt = 0;
    let animationFrame = 0;
    let lastScrollAt = 0;
    let cubeInteractionEnabled = false;
    let directoryIsVisible = false;
    let reportedCubeFaceIndex = 0;
    const cubeContentHoverValues = new Map<THREE.MeshBasicMaterial, number>();
    const cubeContentHoverFrom = new Map<THREE.MeshBasicMaterial, number>();
    const cubeContentHoverTo = new Map<THREE.MeshBasicMaterial, number>();
    let cubeContentHoverMaterial: THREE.MeshBasicMaterial | null = null;
    let cubeContentHoverTransitionStartedAt = 0;
    let cubeHoverResolved = false;

    cubeContentMaterials.forEach((material) => {
      cubeContentHoverValues.set(material, 0);
      cubeContentHoverFrom.set(material, 0);
      cubeContentHoverTo.set(material, 0);
    });

    const setCubeContentHoverTarget = (material: THREE.MeshBasicMaterial | null, now: number) => {
      if (cubeContentHoverMaterial === material) return;
      cubeContentHoverMaterial = material;
      cubeContentHoverTransitionStartedAt = now;
      cubeContentMaterials.forEach((contentMaterial) => {
        cubeContentHoverFrom.set(contentMaterial, cubeContentHoverValues.get(contentMaterial) ?? 0);
        cubeContentHoverTo.set(contentMaterial, contentMaterial === material ? 1 : 0);
      });
    };

    const updateCubeContentHover = (now: number) => {
      const progress = easeOutCubic(clamp01(
        (now - cubeContentHoverTransitionStartedAt) / CUBE_CONTENT_HOVER_DURATION_MS,
      ));
      cubeContentMaterials.forEach((material) => {
        const from = cubeContentHoverFrom.get(material) ?? 0;
        const to = cubeContentHoverTo.get(material) ?? 0;
        const value = THREE.MathUtils.lerp(from, to, progress);
        cubeContentHoverValues.set(material, value);
        const uniform = material.userData.cubeContentHoverScaleUniform as { value: number } | undefined;
        if (uniform) uniform.value = 1 + (CUBE_CONTENT_HOVER_SCALE - 1) * value;
      });
    };

    const reportCubeFaceIndex = (index: number) => {
      if (reportedCubeFaceIndex === index) return;
      reportedCubeFaceIndex = index;
      setActiveCubeProjectIndex(index);
    };

    const syncDirectoryVisibility = (visible: boolean) => {
      if (directoryIsVisible === visible) return;
      directoryIsVisible = visible;
      pointerNeedsUpdate = true;
      setCubeDirectoryVisible(visible);
    };

    const restoreDynamicCubeMaterials = () => {
      let materialsChanged = false;
      for (let slot = 0; slot < cubeMaterials.length; slot += 1) {
        if (cubeMaterials[slot] !== canonicalCubeMaterials[slot]) {
          cubeMaterials[slot] = canonicalCubeMaterials[slot];
          materialsChanged = true;
        }
      }
      if (materialsChanged) cube.material = cubeMaterials;
    };

    const applyCubeFaceMaterial = (index: number) => {
      // Keep the selected project and its immediate neighbors in sequence on
      // the four faces that rotate through the camera. Clear every other
      // cover so a non-adjacent project cannot appear beside the active one.
      const visibleProjectIndices = [index - 1, index, index + 1]
        .filter((projectIndex) => projectIndex >= 0 && projectIndex < PROJECT_DIRECTORY.length);
      const nextMaterials = cubeMaterials.map(() => cubeBlackMaterial);
      visibleProjectIndices.forEach((projectIndex) => {
        const materialSlot = cubeProjectMaterialSlots[projectIndex];
        const projectMaterial = cubeProjectMaterials[projectIndex];
        if (materialSlot !== undefined && projectMaterial) nextMaterials[materialSlot] = projectMaterial;
      });

      let materialsChanged = false;
      for (let slot = 0; slot < cubeMaterials.length; slot += 1) {
        if (cubeMaterials[slot] !== nextMaterials[slot]) {
          cubeMaterials[slot] = nextMaterials[slot];
          materialsChanged = true;
        }
      }
      if (materialsChanged) cube.material = cubeMaterials;
    };

    const startCubeFaceTurn = (index: number, now = performance.now()) => {
      const nextIndex = Math.max(0, Math.min(PROJECT_DIRECTORY.length - 1, index));
      if (nextIndex === cubeFaceIndex && !cubeTurning) return;
      if (cubeTurning) {
        queuedCubeFaceIndex = nextIndex;
        reportCubeFaceIndex(nextIndex);
        scheduleDraw();
        return;
      }

      cubeFaceIndex = nextIndex;
      reportCubeFaceIndex(nextIndex);
      cubeTurnFromRotation = cubeFaceRotation;
      cubeTurnToRotation = CUBE_FACE_REST_OFFSET + nextIndex * (Math.PI / 2);
      cubeTurnStartedAt = now;
      cubeTurnDuration = Math.min(
        900,
        Math.max(420, CUBE_TURN_DURATION_MS + (Math.abs(cubeTurnToRotation - cubeTurnFromRotation) / (Math.PI / 2) - 1) * 80),
      );
      cubeTurning = true;
      applyCubeFaceMaterial(nextIndex);
      scheduleDraw();
    };

    const selectCubeProject = (index: number) => {
      if (!cubeInteractionEnabled || index < 0 || index >= PROJECT_DIRECTORY.length) return;
      startCubeFaceTurn(index);
    };
    cubeProjectSelectRef.current = selectCubeProject;

    const updatePointer = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      pointerNeedsUpdate = true;
    };

    const clearPointer = () => {
      pointer.set(2, 2);
      pointerNeedsUpdate = true;
      activeHoverIndex = -1;
    };

    const handleCubeActivate = (event: PointerEvent) => {
      if (!cubeInteractionEnabled) return;
      const eventTarget = event.target;
      if (eventTarget instanceof Element && eventTarget.closest(".project-directory__item")) return;
      updatePointer(event);
      scene.updateMatrixWorld(true);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.intersectObject(cube, false).length) {
        openShowcase(SHOWCASE_PROJECT_ORDER[cubeFaceIndex] ?? "ainow-a");
      }
    };

    const syncScrollProgress = () => {
      const bounds = section.getBoundingClientRect();
      const distance = Math.max(1, section.offsetHeight - window.innerHeight);
      const raw = Math.max(0, Math.min(1, -bounds.top / distance));
      const letterRaw = clamp01(raw / LETTER_SEQUENCE_PORTION);
      scrollProgress = letterRaw * letterRaw * (3 - 2 * letterRaw);
      cubeTarget = clamp01((raw - CUBE_REVEAL_START) / (1 - CUBE_REVEAL_START));
      const directoryProgress = ease(cubeTarget);
      // Keep the interaction and directory from toggling while the scroll
      // settles around the reveal threshold.
      cubeInteractionEnabled = directoryIsVisible
        ? directoryProgress >= CUBE_DIRECTORY_HIDE_PROGRESS
        : directoryProgress >= CUBE_DIRECTORY_VISIBLE_PROGRESS;
      lastScrollAt = performance.now();
    };

    const handleCubeWheel = (event: WheelEvent) => {
      // Once the exhibition is open, its content uses the document's native
      // scrollbar rather than the cube interaction underneath.
      if (showcaseRef.current?.classList.contains("is-open")) return;
      if (!cubeInteractionEnabled || !directoryIsVisible || renderedProgress < 0.995) return;
      let delta = event.deltaY;
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 16;
      if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= window.innerHeight;
      if (!Number.isFinite(delta) || delta === 0) return;

      const now = performance.now();
      if (now - cubeWheelAccumulatorAt > CUBE_WHEEL_IDLE_MS) {
        cubeWheelAccumulator = 0;
        cubeWheelGestureLocked = false;
      }
      cubeWheelAccumulatorAt = now;

      // A single wheel gesture can emit a long burst of events, especially on
      // trackpads. Once one face turn has started, consume the rest of that
      // burst instead of queueing additional turns and letting the cube skip
      // over adjacent projects.
      if (cubeWheelGestureLocked || cubeTurning) {
        event.preventDefault();
        return;
      }

      cubeWheelAccumulator += delta;
      const direction = Math.sign(cubeWheelAccumulator);
      if (!direction) return;

      // While viewing a later face, upward scroll reverses one cube turn instead
      // of immediately handing control back to the page scroll position.
      if (direction < 0 && cubeFaceIndex === 0 && !cubeTurning) {
        cubeWheelAccumulator = 0;
        return;
      }
      event.preventDefault();
      if (Math.abs(cubeWheelAccumulator) < CUBE_WHEEL_STEP_THRESHOLD) return;

      cubeWheelAccumulator = 0;
      const nextFace = cubeFaceIndex + direction;
      if (nextFace >= 0 && nextFace < PROJECT_DIRECTORY.length) {
        cubeWheelGestureLocked = true;
        startCubeFaceTurn(nextFace, now);
      } else {
        cubeWheelGestureLocked = false;
      }
    };

    function scheduleDraw() {
      if (!disposed && !showcaseOpenRef.current && document.visibilityState === "visible" && !animationFrame) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    }

    function draw(now: number) {
      animationFrame = 0;
      if (showcaseOpenRef.current || document.visibilityState !== "visible") return;
      const delta = previousFrameAt ? Math.min(0.05, Math.max(0.001, (now - previousFrameAt) / 1000)) : 0.016;
      previousFrameAt = now;
      progressVelocity += (scrollProgress - renderedProgress) * 108 * delta;
      progressVelocity *= Math.exp(-16 * delta);
      renderedProgress = clamp01(renderedProgress + progressVelocity * delta);
      if (Math.abs(scrollProgress - renderedProgress) < 0.00008 && Math.abs(progressVelocity) < 0.0008) {
        renderedProgress = scrollProgress;
        progressVelocity = 0;
      }

      const progress = renderedProgress;
      const cubeProgress = ease(cubeTarget);
      const cubeOpacity = ease(clamp01(cubeTarget * 2));
      const scrollSettled = ease(clamp01((now - lastScrollAt - 140) / 760));
      const inertiaSettled = 1 - ease(clamp01(Math.abs(progressVelocity) / 0.12));
      const settled = scrollSettled * inertiaSettled;
      const topIdle = 1 - ease(clamp01(progress / 0.1));
      const idleAmount = settled * (0.28 + topIdle * 0.72);
      const time = now / 1000;
      const burstStartedAt = introBurstStartedAt.current;
      const introBurstProgress = burstStartedAt === null
        ? 0
        : clamp01((now - burstStartedAt) / 380);
      const introBurstTravel = burstStartedAt === null ? 0 : easeOutBack(introBurstProgress);
      const introBurstScale = clamp01(introBurstTravel);

      const letterCameraInfluence = 1 - cubeProgress;
      if (letterCameraInfluence > 0.001) {
        camera.position.x = Math.sin(progress * Math.PI * 1.25) * 115 * letterCameraInfluence;
        camera.position.y = (Math.cos(progress * Math.PI * 1.5) - 1) * 72 * letterCameraInfluence;
        camera.position.z = baseCameraZ - Math.sin(progress * Math.PI) * 420;
        camera.lookAt(0, 0, 0);
      }
      if (cubeProgress < 0.999) {
        scene.updateMatrixWorld(true);
        raycaster.setFromCamera(pointer, camera);
        const hit = settled > 0.8 ? raycaster.intersectObjects(interactiveMeshes, false)[0] : undefined;
        if (hit) {
          activeHoverIndex = hit.object.userData.anchorIndex as number;
        }
        if (activeHoverIndex >= 0 && settled > 0.8) {
          const activeAnchor = anchors[activeHoverIndex]?.group;
          if (activeAnchor) {
            activeAnchor.getWorldPosition(anchorWorld);
            projectedAnchor.copy(anchorWorld).project(camera);
            const pointerDistance = Math.hypot(pointer.x - projectedAnchor.x, pointer.y - projectedAnchor.y);
            if (pointerDistance > 0.24) {
              activeHoverIndex = -1;
            } else {
              camera.getWorldDirection(cameraDirection);
              hoverPlane.setFromNormalAndCoplanarPoint(cameraDirection, anchorWorld);
              const planePoint = raycaster.ray.intersectPlane(hoverPlane, hoverPoint);
              if (planePoint) lettersRoot.worldToLocal(hoverPoint);
            }
          }
        }
      } else {
        activeHoverIndex = -1;
      }
      if (activeHoverIndex !== previousHoverIndex) {
        if (activeHoverIndex >= 0) {
          sweepIndex = activeHoverIndex;
          sweepStartedAt = now;
        }
        previousHoverIndex = activeHoverIndex;
      }

      if (cubeProgress < 0.999) anchors.forEach(({ group, base }, index) => {
        const [x, y, z] = MOTION[index % MOTION.length];
        const choreography = CHOREOGRAPHY[index % CHOREOGRAPHY.length];
        const motionProgress = ease(clamp01((progress - choreography.delay) / (1 - choreography.delay)));
        const collapseProgress = ease(clamp01((progress - choreography.collapse) / (1 - choreography.collapse)));
        const offsetX = base.x - compositionCenter.x;
        const offsetY = base.y - compositionCenter.y;
        const spin = choreography.direction * (
          choreography.turns * Math.PI * 2 * motionProgress +
          choreography.wobble * (Math.sin(motionProgress * Math.PI * 2 + choreography.phase) - Math.sin(choreography.phase))
        );
        const radial = 1 - choreography.pull * motionProgress - (1 - choreography.pull) * collapseProgress;
        const cosine = Math.cos(spin);
        const sine = Math.sin(spin);
        const drift = Math.sin(motionProgress * Math.PI) * choreography.wobble * 480 * (1 - collapseProgress);
        const floatSpeed = 0.38 + index * 0.043;
        const floatX = Math.sin(time * floatSpeed + choreography.phase) * 13 * idleAmount;
        const floatY = Math.cos(time * (floatSpeed * 1.17) + choreography.phase) * 18 * idleAmount;
        const floatZ = Math.sin(time * (floatSpeed * 0.73) + choreography.phase) * 82 * idleAmount;
        const normalPositionX = compositionCenter.x + (offsetX * cosine - offsetY * sine) * radial + Math.cos(spin + choreography.phase) * drift + floatX;
        const normalPositionY = compositionCenter.y + (offsetX * sine + offsetY * cosine) * radial + Math.sin(spin * 1.3 + choreography.phase) * drift + floatY;
        const normalPositionZ = choreography.depth * Math.sin(motionProgress * Math.PI) + floatZ;
        group.position.set(
          compositionCenter.x + (normalPositionX - compositionCenter.x) * introBurstTravel,
          compositionCenter.y + (normalPositionY - compositionCenter.y) * introBurstTravel,
          normalPositionZ * introBurstTravel,
        );
        const hoverTarget = index === activeHoverIndex ? 1 : 0;
        hoverStrength[index] += (hoverTarget - hoverStrength[index]) * 0.075;
        if (hoverStrength[index] > 0.001) {
          const awayX = group.position.x - hoverPoint.x;
          const awayY = group.position.y - hoverPoint.y;
          const distance = Math.max(1, Math.hypot(awayX, awayY));
          group.position.x += (awayX / distance) * 115 * hoverStrength[index];
          group.position.y += (awayY / distance) * 115 * hoverStrength[index];
          group.position.z -= 85 * hoverStrength[index];
        }
        group.scale.setScalar(Math.max(0.016, 1 - collapseProgress * 0.984) * (0.03 + 0.97 * introBurstScale));
        group.rotation.set(
          x * motionProgress + choreography.direction * motionProgress * Math.PI * (0.45 + choreography.turns * 0.25) + (Math.sin(motionProgress * Math.PI + choreography.phase) - Math.sin(choreography.phase)) * 0.28 + Math.sin(time * floatSpeed + choreography.phase) * 0.025 * idleAmount,
          y * motionProgress + (Math.sin(motionProgress * Math.PI * 2 + choreography.phase) - Math.sin(choreography.phase)) * 0.72 + Math.cos(time * floatSpeed * 0.8 + choreography.phase) * 0.035 * idleAmount,
          z * motionProgress + choreography.direction * choreography.turns * motionProgress * Math.PI * 2 + (Math.sin(motionProgress * Math.PI * 3 + choreography.phase) - Math.sin(choreography.phase)) * 0.3 + Math.sin(time * floatSpeed * 0.65 + choreography.phase) * 0.018 * idleAmount,
        );
        group.rotation.y += hoverStrength[index] * choreography.direction * 0.1;
      });

      const sweepProgress = clamp01((now - sweepStartedAt) / 620);
      const sweepAnchor = anchors[sweepIndex]?.group;
      if (cubeProgress < 0.999 && sweepAnchor && sweepProgress < 1) {
        scene.updateMatrixWorld(true);
        sweepPosition.set(
          -330 + sweepProgress * 660,
          Math.sin(sweepProgress * Math.PI) * 45,
          260,
        );
        sweepAnchor.localToWorld(sweepPosition);
        sweepLight.position.copy(sweepPosition);
        sweepLight.intensity = Math.sin(sweepProgress * Math.PI) * 95;
      } else {
        sweepLight.intensity = 0;
      }

      const dotMaterial = dot.material as THREE.MeshBasicMaterial;
      dotMaterial.opacity = Math.max(0, (progress - 0.76) / 0.24) * (1 - cubeProgress);
      dot.scale.setScalar(0.25 + Math.max(0, (progress - 0.76) / 0.24) * 0.75);
      cube.visible = cubeProgress > 0.001;
      cubeBlackMaterial.opacity = cubeOpacity;
      firstVideoMaterial.opacity = cubeOpacity;
      versionBCoverMaterial.opacity = cubeOpacity;
      secondVideoMaterial.opacity = cubeOpacity;
      thirdImageMaterial.opacity = cubeOpacity;
      fourthImageMaterial.opacity = cubeOpacity;
      fifthImageMaterial.opacity = cubeOpacity;
      sixthImageMaterial.opacity = cubeOpacity;
      cube.scale.setScalar(0.01 + cubeProgress * (maxCubeScale * CUBE_FINAL_SCALE - 0.01));
      const directoryProgress = directoryIsVisible
        ? cubeProgress >= CUBE_DIRECTORY_HIDE_PROGRESS
        : cubeProgress >= CUBE_DIRECTORY_VISIBLE_PROGRESS;
      syncDirectoryVisibility(directoryProgress);
      // The directory is the hand-off point from the gathering animation to
      // the cube. Do not leave the previous 3D letter meshes behind the cube.
      lettersRoot.visible = !directoryProgress;
      if (directoryProgress) {
        if (cubeTurning) {
          const turnProgress = clamp01((now - cubeTurnStartedAt) / cubeTurnDuration);
          cubeFaceRotation = THREE.MathUtils.lerp(
            cubeTurnFromRotation,
            cubeTurnToRotation,
            easeInOutCubic(turnProgress),
          );
          if (turnProgress >= 1) {
            cubeFaceRotation = cubeTurnToRotation;
            cubeTurning = false;
            pointerNeedsUpdate = true;
            const queuedFace = queuedCubeFaceIndex;
            queuedCubeFaceIndex = null;
            if (queuedFace !== null && queuedFace !== cubeFaceIndex) {
              startCubeFaceTurn(queuedFace, now);
            }
          }
        }
        cube.rotation.set(cubeFaceRotation, 0, 0);
      } else {
        cubeFaceIndex = 0;
        queuedCubeFaceIndex = null;
        cubeWheelAccumulator = 0;
        cubeWheelAccumulatorAt = 0;
        cubeWheelGestureLocked = false;
        reportCubeFaceIndex(0);
        cubeFaceRotation = CUBE_FACE_REST_OFFSET;
        cubeTurning = false;
        cubeTurnFromRotation = CUBE_FACE_REST_OFFSET;
        cubeTurnToRotation = CUBE_FACE_REST_OFFSET;
        restoreDynamicCubeMaterials();
        const cubeIntroRotation = (1 - cubeProgress) * CUBE_INTRO_ROTATION_TURNS * Math.PI * 2;
        cube.rotation.set(CUBE_FACE_REST_OFFSET + cubeIntroRotation, 0, 0);
      }
      const cubeCanInteract = cubeInteractionEnabled
        && directoryProgress
        && !showcaseRef.current?.classList.contains("is-open");
      if (cubeCanInteract) {
        if (pointerNeedsUpdate || cubeTurning || !cubeHoverResolved) {
          scene.updateMatrixWorld(true);
          raycaster.setFromCamera(pointer, camera);
          const cubeHit = raycaster.intersectObject(cube, false)[0];
          const hitMaterialIndex = cubeHit?.face?.materialIndex ?? -1;
          const hitMaterial = getCubeMaterialAt(hitMaterialIndex);
          const nextHoverMaterial = !cubeTurning
            && hitMaterial instanceof THREE.MeshBasicMaterial
            && hitMaterial.map
            ? hitMaterial
            : null;
          setCubeContentHoverTarget(nextHoverMaterial, now);
          if (section) section.style.cursor = cubeHit ? "pointer" : "default";
          cubeHoverResolved = true;
          pointerNeedsUpdate = false;
        }
      } else {
        setCubeContentHoverTarget(null, now);
        cubeHoverResolved = false;
        pointerNeedsUpdate = true;
        // The showcase owns its cursor while open. Do not leave a per-frame
        // inline canvas cursor behind while the project content is visible.
        if (section) section.style.cursor = "";
      }
      updateCubeContentHover(now);
      render();
      scheduleDraw();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleDraw();
    };

    resize();
    syncScrollProgress();
    resumeWebglRef.current = scheduleDraw;
    scheduleDraw();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", syncScrollProgress, { passive: true });
    window.addEventListener("wheel", handleCubeWheel, { passive: false });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    section.addEventListener("pointermove", updatePointer);
    section.addEventListener("pointerleave", clearPointer);
    section.addEventListener("pointerup", handleCubeActivate);

    return () => {
      disposed = true;
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", syncScrollProgress);
      window.removeEventListener("wheel", handleCubeWheel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      section.removeEventListener("pointermove", updatePointer);
      section.removeEventListener("pointerleave", clearPointer);
      section.removeEventListener("pointerup", handleCubeActivate);
      section.style.cursor = "";
      if (cubeProjectSelectRef.current === selectCubeProject) cubeProjectSelectRef.current = null;
      window.cancelAnimationFrame(animationFrame);
      faceMaterial.dispose();
      edgeMaterial.dispose();
      dot.geometry.dispose();
      (dot.material as THREE.Material).dispose();
      cube.geometry.dispose();
      cubeBlackMaterial.dispose();
      firstVideoMaterial.dispose();
      versionBCoverMaterial.dispose();
      secondVideoMaterial.dispose();
      thirdImageMaterial.dispose();
      fourthImageMaterial.dispose();
      fifthImageMaterial.dispose();
      sixthImageMaterial.dispose();
      firstCubeVideo.texture.dispose();
      secondCubeVideo.texture.dispose();
      thirdFaceTexture.dispose();
      fourthFaceTexture.dispose();
      fifthFaceTexture.dispose();
      sixthFaceTexture.dispose();
      firstFacePosterTexture.dispose();
      versionBCoverTexture.dispose();
      firstCubeVideo.video.pause();
      secondCubeVideo.video.pause();
      firstCubeVideo.video.removeEventListener("loadeddata", revealFirstVideo);
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      resumeWebglRef.current = null;
    };
  }, [openShowcase]);

  const clearConceptHover = useCallback(() => {
    conceptHoverTarget.current = null;
    if (conceptHoverTimer.current !== null) {
      window.clearTimeout(conceptHoverTimer.current);
      conceptHoverTimer.current = null;
    }
  }, []);
  const startConceptTransition = useCallback((targetIndex: number) => {
    conceptHoverTarget.current = null;
    if (conceptHoverTimer.current !== null) {
      window.clearTimeout(conceptHoverTimer.current);
      conceptHoverTimer.current = null;
    }
    if (conceptMotionTimer.current !== null) window.clearTimeout(conceptMotionTimer.current);
    if (conceptRecenterFrame.current !== null) window.cancelAnimationFrame(conceptRecenterFrame.current);
    if (conceptUnlockFrame.current !== null) window.cancelAnimationFrame(conceptUnlockFrame.current);
    setConceptRecentering(false);
    conceptMotionLocked.current = true;
    // Time alone must not re-enable hover. Moving cards and the invisible
    // duplicate reset can both change the DOM node beneath a stationary cursor.
    // Require a deliberate physical pointer move before accepting another card.
    conceptHoverArmed.current = false;
    conceptLockPosition.current = conceptPointerPosition.current;
    activeConceptRef.current = targetIndex;
    setActiveConceptIndex(targetIndex);
    conceptMotionTimer.current = window.setTimeout(() => {
      const normalizedIndex = conceptDataIndex(targetIndex);
      conceptMotionTimer.current = null;
      if (normalizedIndex === targetIndex) {
        conceptMotionLocked.current = false;
        return;
      }
      // Ten ruler marks equal one five-card cycle. Resetting both virtual rails
      // with transitions disabled is invisible and prevents index drift.
      setConceptRecentering(true);
      activeConceptRef.current = normalizedIndex;
      setActiveConceptIndex(normalizedIndex);
      conceptRecenterFrame.current = window.requestAnimationFrame(() => {
        conceptUnlockFrame.current = window.requestAnimationFrame(() => {
          setConceptRecentering(false);
          conceptMotionLocked.current = false;
          conceptRecenterFrame.current = null;
          conceptUnlockFrame.current = null;
        });
      });
    }, CONCEPT_TRANSITION_MS + 20);
  }, []);
  const activateConcept = useCallback((virtualIndex: number) => {
    if (conceptMotionLocked.current) return;
    const dataIndex = conceptDataIndex(virtualIndex);
    if (dataIndex === conceptDataIndex(activeConceptRef.current)) return;
    startConceptTransition(nearestConceptIndex(dataIndex, activeConceptRef.current));
  }, [startConceptTransition]);
  const scheduleConceptActivation = useCallback((virtualIndex: number) => {
    if (conceptMotionLocked.current || !conceptHoverArmed.current) return;
    const dataIndex = conceptDataIndex(virtualIndex);
    if (dataIndex === conceptDataIndex(activeConceptRef.current)) return;
    clearConceptHover();
    conceptHoverTarget.current = virtualIndex;
    conceptHoverTimer.current = window.setTimeout(() => {
      conceptHoverTimer.current = null;
      if (!conceptPointerInside.current || conceptMotionLocked.current || conceptHoverTarget.current !== virtualIndex) return;
      conceptHoverTarget.current = null;
      activateConcept(virtualIndex);
    }, CONCEPT_HOVER_DELAY);
  }, [activateConcept, clearConceptHover]);
  const handleConceptPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    conceptPointerPosition.current = { x: event.clientX, y: event.clientY };
    if (conceptMotionLocked.current || conceptHoverArmed.current) return;
    const deltaX = event.clientX - conceptLockPosition.current.x;
    const deltaY = event.clientY - conceptLockPosition.current.y;
    if (Math.hypot(deltaX, deltaY) >= CONCEPT_REARM_DISTANCE) conceptHoverArmed.current = true;
  }, []);
  const conceptDistance = (virtualIndex: number) => Math.abs(virtualIndex - activeConceptIndex);
  const conceptStyle = (virtualIndex: number) => {
    const distance = conceptDistance(virtualIndex);
    return {
      "--concept-left": `${conceptSlotPosition(virtualIndex, activeConceptIndex)}%`,
      "--concept-width": `${conceptWidthAtDistance(distance)}%`,
      "--concept-label-size": `${FOCUS_LABEL_SIZES[Math.min(distance, FOCUS_LABEL_SIZES.length - 1)]}px`,
      "--concept-style-size": `${FOCUS_STYLE_SIZES[Math.min(distance, FOCUS_STYLE_SIZES.length - 1)]}px`,
      "--concept-label-y": `${FOCUS_LABEL_Y[Math.min(distance, FOCUS_LABEL_Y.length - 1)]}%`,
      "--concept-style-y": `${FOCUS_STYLE_Y[Math.min(distance, FOCUS_STYLE_Y.length - 1)]}%`,
      zIndex: 10 - Math.min(distance, 4),
    } as React.CSSProperties;
  };
  const conceptRulerTickStyle = (tickIndex: number) => {
    const relativeIndex = tickIndex - activeConceptIndex * RULER_TICKS_PER_CARD;
    const centerProximity = Math.max(0, 1 - Math.abs(relativeIndex) / (RULER_RADII.length - 1));
    return {
      left: `${rulerPosition(relativeIndex)}%`,
      height: `${10.5 + 5.25 * Math.pow(centerProximity, .72)}px`,
      opacity: .42 + .35 * Math.pow(centerProximity, .8),
    } as React.CSSProperties;
  };
  const resetConceptFocus = () => {
    conceptPointerInside.current = false;
    conceptHoverArmed.current = false;
    clearConceptHover();
    const targetIndex = nearestConceptIndex(2, activeConceptRef.current);
    if (conceptDataIndex(activeConceptRef.current) !== 2) startConceptTransition(targetIndex);
  };

  return (
    <main className={showcaseOpen ? "showcase-active" : undefined}>
      {loadingVisible ? (
        <LoadingIntro
          ready={metalLettersReady}
          onBurstStart={startMetalBurst}
          onComplete={finishLoading}
        />
      ) : null}
      <section ref={sectionRef} className="scroll-sequence" aria-label="Scroll to gather the letters" aria-hidden={showcaseOpen}>
        <div className="pinned-frame">
          <div ref={canvasRef} className="webgl-composition" aria-hidden="true" />
          <nav
            className={`project-directory ${cubeDirectoryVisible ? "is-visible" : ""}`}
            aria-label="Project directory"
            aria-hidden={!cubeDirectoryVisible}
          >
            <div className="project-directory__column project-directory__column--left">
              {PROJECT_DIRECTORY.map((project, index) => (
                <button
                  key={project.name}
                  type="button"
                  className={`project-directory__item ${activeCubeProjectIndex === index ? "is-active" : ""}`}
                  aria-current={activeCubeProjectIndex === index ? "page" : undefined}
                  disabled={!cubeDirectoryVisible}
                  onClick={() => cubeProjectSelectRef.current?.(index)}
                >
                  {project.name}
                </button>
              ))}
            </div>
            <div className="project-directory__column project-directory__column--right">
              {PROJECT_DIRECTORY.map((project, index) => (
                <button
                  key={`${project.name}-${project.discipline}`}
                  type="button"
                  className={`project-directory__item ${activeCubeProjectIndex === index ? "is-active" : ""}`}
                  aria-current={activeCubeProjectIndex === index ? "page" : undefined}
                  disabled={!cubeDirectoryVisible}
                  onClick={() => cubeProjectSelectRef.current?.(index)}
                >
                  {project.discipline}
                </button>
              ))}
            </div>
          </nav>
          <p className={`scroll-cue ${cubeDirectoryVisible ? "is-hidden" : ""}`} aria-hidden={cubeDirectoryVisible}>
            scroll to gather
          </p>
        </div>
      </section>
      <section
        ref={showcaseRef}
        className={`showcase ${showcaseOpen ? "is-open" : ""} ${isAinowProject ? "is-ainow" : ""} ${showcaseProject === "august22" ? "is-project-two" : ""} ${showcaseProject === "hoo" ? "is-hoo" : ""} ${showcaseProject === "holiday" ? "is-holiday-kv" : ""} ${showcaseProject === "muning" ? "is-muning" : ""} ${showcaseProject === "other" ? "is-other-works" : ""}`}
        aria-hidden={!showcaseOpen}
        aria-label={isAinowProject ? `AI NOW Version ${isHackathonVersion ? "A" : "B"} project` : showcaseProject === "august22" ? "Lost and found project" : showcaseProject === "hoo" ? "Hōo brand identity project" : showcaseProject === "holiday" ? "Holiday KV project" : showcaseProject === "muning" ? "Muning Ring project" : showcaseProject === "other" ? "Other works" : "Project showcase"}
      >
        <div className="showcase-stage">
          {showcaseProject === "august22" ? (
            <>
              <div className="showcase-project-two-panel">
                <video
                  key="august22"
                  ref={showcaseProjectVideoRef}
                  className="showcase-project-two-film"
                  src="/showcase/august-22.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  aria-label="8月22日项目视频"
                />
              </div>
              </>
          ) : isAinowProject ? (
              <div className="showcase-pavilion">
                {isHackathonVersion ? (
                  <video
                    className="showcase-film"
                    ref={showcaseHeroVideoRef}
                    src="/showcase/exhibition-hero.mp4"
                    autoPlay={showcaseOpen && isHackathonVersion}
                    muted
                    loop
                    playsInline
                    preload={showcaseOpen ? "auto" : "metadata"}
                    aria-label="Hackathon showcase film"
                  />
                ) : (
                  <img
                    className="showcase-version-b-cover"
                    src="/showcase/ainow/version-b-cover.png"
                    alt="AI NOW Design Campaign cover in a public gallery"
                  />
                )}
              </div>
          ) : null}
        </div>
        <section className={`showcase-info ${showcaseProject === "august22" ? "showcase-project-two-info" : ""} ${showcaseProject === "hoo" ? "showcase-hoo-info" : ""} ${showcaseProject === "holiday" ? "showcase-holiday-kv-info" : ""} ${showcaseProject === "muning" ? "showcase-muning-info" : ""}`} aria-label={isAinowProject ? `AI NOW Version ${isHackathonVersion ? "A" : "B"} project details` : showcaseProject === "other" ? "Other works details" : showcaseProject === "hoo" ? "Hōo project details" : showcaseProject === "holiday" ? "Holiday KV project details" : showcaseProject === "muning" ? "Muning Ring project details" : "Project details"}>
          {showcaseProject === "other" ? <OtherWorksGallery /> : null}
          {showcaseProject === "hoo" ? <HooGallery /> : null}
          {showcaseProject === "holiday" ? <HolidayKvGallery /> : null}
          {showcaseProject === "muning" ? <MuningGallery /> : null}
          {isAinowProject || showcaseProject === "august22" ? (
            <header className="ainow-intro">
              <div className="ainow-intro-main">
                <img
                  className="ainow-white-logo"
                  src={showcaseProject === "august22" ? "/showcase/project-two-logo.png" : "/showcase/ainow/logo-white.png"}
                  alt={showcaseProject === "august22" ? "日梦片场" : "AI NOW"}
                />
                <div className="ainow-reveal-shell">
                  <div className="ainow-intro-copy">
                    <h1>{showcaseProject === "august22" ? "创作者社区设计" : "CapCut 创作者品牌设计"}</h1>
                    <p>
                      {showcaseProject === "august22"
                        ? "打造一个 AI 短片风向标的创作者交流平台"
                        : <>围绕CapCut AI 创作者活动打造视觉识别系统<br />构建兼具识别感与延展性的视觉设计</>}
                    </p>
                  </div>
                </div>
              </div>
              <dl className="ainow-meta">
                <div><dt>项目时间</dt><dd>{showcaseProject === "august22" ? "2026.1-4" : "2026.3"}</dd></div>
                <div>
                  <dt>项目内容</dt>
                  <dd>{showcaseProject === "august22" ? <>UIUX设计<br />AI Coding</> : <>品牌设计<br />动态设计</>}</dd>
                </div>
              </dl>
            </header>
          ) : null}

          {showcaseProject === "august22" ? (
            <section className="showcase-project-two-gallery" aria-label="Project 2 visuals">
              <img
                src="/showcase/project-two-01.png"
                alt="日梦片场项目概念图"
                loading="lazy"
                decoding="async"
              />
              <ProjectTwoStory />
              <ProjectTwoExploration />
              <ProjectTwoInterfaceMap />
            </section>
          ) : null}

          {isAinowProject ? (
            <>
          <div className="ainow-rule" />

            <section className="ainow-manifesto">
              <img
                className="ainow-cyan-logo"
                src={isHackathonVersion ? "/showcase/ainow/logo-cyan.png" : "/showcase/ainow/logo-version-a.png"}
                alt="AI NOW"
              />
              <ScrollReveal className="ainow-reveal-shell">
                <div className="ainow-manifesto-copy">
                  <div className="ainow-letters" aria-label="AI NOW meaning">
                    <span><i aria-hidden="true" /><b>A</b><em>{isHackathonVersion ? "Assemble" : "灵感"}</em></span>
                    <span><i aria-hidden="true" /><b>I</b><em>{isHackathonVersion ? "Imagine" : "剪辑"}</em></span>
                    <span><i aria-hidden="true" /><b>N</b><em>{isHackathonVersion ? "Narrate" : "影视"}</em></span>
                    <span><i aria-hidden="true" /><b>O</b><em>{isHackathonVersion ? "Originate" : "创作"}</em></span>
                    <span><i aria-hidden="true" /><b>W</b><em>{isHackathonVersion ? "Wrap" : "选择"}</em></span>
                  </div>
                  <p>
                    {isHackathonVersion ? (
                      <>「Hackathon / Showcase」，需要展现CapCut在AI创作领域的前沿实力、克制的科技美感<br />和「O」的空心，延续品牌logo的字形的同时，强化识别度</>
                    ) : (
                      <>「Design / Campaign」活动，需要丰富的情绪语言、活力的视觉表达<br />借助抽象化的字母图形，形成开放、具有创作者属性的视觉系统</>
                    )}
                  </p>
                </div>
              </ScrollReveal>
            </section>

          {!isHackathonVersion ? (
            <section className="ainow-version-a-gallery" aria-label="AI NOW Design Campaign applications">
              <figure className="ainow-version-a-artboard">
                <img
                  className="ainow-version-a-artboard-base"
                  src="/showcase/ainow/version-a/01-253.png"
                  alt="AI NOW letter graphics and campaign applications"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
              <figure><img src="/showcase/ainow/version-a/02-222.png" alt="CapCut AI NOW campaign key visual" loading="lazy" decoding="async" /></figure>
              <figure><img src="/showcase/ainow/version-a/03-staff-visitor-guest.png" alt="AI NOW staff, visitor and guest identity cards" loading="lazy" decoding="async" /></figure>
              <WayfindingScene />
            </section>
          ) : (
            <>
            <section className="ainow-concepts" aria-label="AI NOW Hackathon Showcase concepts">
            <div
              className={`ainow-rows${conceptRecentering ? " is-recentering" : ""}`}
              onPointerEnter={(event) => {
                if (event.pointerType !== "mouse") return;
                conceptPointerInside.current = true;
                conceptHoverArmed.current = true;
                conceptPointerPosition.current = { x: event.clientX, y: event.clientY };
              }}
              onPointerMoveCapture={handleConceptPointerMove}
              onPointerLeave={resetConceptFocus}
            >
              <div className="ainow-axis ainow-axis-concept">/概念/</div>
              <div className="ainow-axis ainow-axis-style">/风格/</div>
              <div className="ainow-ruler ainow-ruler-top" aria-hidden="true">
                <div className="ainow-ruler-track">
                  {RULER_VIRTUAL_INDICES.map((tickIndex) => (
                    <i key={`top-${tickIndex}`} className="ainow-ruler-tick" style={conceptRulerTickStyle(tickIndex)} />
                  ))}
                </div>
              </div>
              <div className="ainow-ruler ainow-ruler-bottom" aria-hidden="true">
                <div className="ainow-ruler-track">
                  {RULER_VIRTUAL_INDICES.map((tickIndex) => (
                    <i key={`bottom-${tickIndex}`} className="ainow-ruler-tick" style={conceptRulerTickStyle(tickIndex)} />
                  ))}
                </div>
              </div>
              <div className="ainow-concept-rail">
                {VIRTUAL_CONCEPT_INDICES.map((virtualIndex) => {
                  const index = conceptDataIndex(virtualIndex);
                  const concept = CONCEPTS[index];
                  return (
                  <article
                    key={`${concept.label}-${virtualIndex}`}
                    className="ainow-row"
                    style={conceptStyle(virtualIndex)}
                    tabIndex={conceptDistance(virtualIndex) <= 2 ? 0 : -1}
                    aria-hidden={conceptDistance(virtualIndex) > 2}
                    onPointerEnter={(event) => { if (event.pointerType === "mouse") scheduleConceptActivation(virtualIndex); }}
                    onPointerLeave={(event) => { if (event.pointerType === "mouse" && conceptHoverTarget.current === virtualIndex) clearConceptHover(); }}
                    onPointerUp={(event) => { if (event.pointerType !== "mouse") activateConcept(virtualIndex); }}
                    onFocus={() => activateConcept(virtualIndex)}
                    aria-label={`${concept.label}, ${concept.style}`}
                  >
                    <div className="ainow-concept-unit">
                      <div className="ainow-label">{concept.label}</div>
                      <img src={concept.image} alt={`${concept.label} concept`} />
                      <div className="ainow-style">{concept.style}</div>
                    </div>
                  </article>
                  );
                })}
              </div>
            </div>
            <ScrollReveal className="ainow-reveal-shell">
              <p className="ainow-closing">拆解AI NOW每个字母对应的含义，使用AI工具，完成图片动态设计</p>
            </ScrollReveal>
            </section>

          <section className="ainow-gallery" aria-label="AI NOW Hackathon Showcase applications">
            <figure className="ainow-media-panel">
                <img
                  src="/showcase/ainow/gallery/01-posters-1920.jpg"
                  srcSet="/showcase/ainow/gallery/01-posters-960.jpg 960w, /showcase/ainow/gallery/01-posters-1440.jpg 1440w, /showcase/ainow/gallery/01-posters-1920.jpg 1920w"
                  sizes="100vw"
                  alt="AI NOW Narrate, Originate and Wrap posters displayed in a station"
                  loading="lazy"
                  decoding="async"
                />
            </figure>
            <figure className="ainow-media-panel ainow-video-panel">
                <video
                  src="/showcase/ainow/gallery/02-ai-now-kv.mp4"
                  poster="/showcase/ainow/gallery/02-ai-now-kv-poster.webp"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="Animated AI NOW campaign key visual"
                />
            </figure>
            <figure className="ainow-media-panel">
                <img
                  src="/showcase/ainow/gallery/03-brand-applications-1920.jpg"
                  srcSet="/showcase/ainow/gallery/03-brand-applications-960.jpg 960w, /showcase/ainow/gallery/03-brand-applications-1440.jpg 1440w, /showcase/ainow/gallery/03-brand-applications-1920.jpg 1920w"
                  sizes="100vw"
                  alt="AI NOW street graphic and branded apparel"
                  loading="lazy"
                  decoding="async"
                />
            </figure>
            <figure className="ainow-media-panel">
                <img
                  src="/showcase/ainow/gallery/04-event-stage-1920.jpg"
                  srcSet="/showcase/ainow/gallery/04-event-stage-960.jpg 960w, /showcase/ainow/gallery/04-event-stage-1440.jpg 1440w, /showcase/ainow/gallery/04-event-stage-1920.jpg 1920w"
                  sizes="100vw"
                  alt="AI NOW Hackathon Showcase event stage"
                  loading="lazy"
                  decoding="async"
                />
            </figure>
          </section>
            </>
          )}
          </>
          ) : null}
        </section>
      </section>
      <nav
        className="showcase-close-overlay"
        aria-label="Showcase navigation"
        aria-hidden={!showcaseOpen}
      >
        <button
          type="button"
          onClick={closeShowcase}
          className="showcase-close"
          aria-label="关闭项目并返回目录"
          disabled={!showcaseOpen}
        >
          <svg className="showcase-close-icon" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M5 5 27 27M27 5 5 27" />
          </svg>
        </button>
      </nav>
    </main>
  );
}
