export interface WorkItem {
  name: string;
  company: string;
  period: string;
  role: string;
  summary: string;
  impact: string;
  technologies: string[];
}

/**
 * Enterprise and product work delivered for previous employers.
 *
 * Deliberately excludes the current employer (Accenture / Cathay Pacific).
 * That work is covered on the portfolio page; while still in the role it is
 * not given deep case-study treatment here.
 */
export const selectedWork: WorkItem[] = [
  {
    name: "iCluster Web",
    company: "Rocket Software (Beijing) Co., Ltd., Dalian Branch",
    period: "2022.04 — 2024.09",
    role: "Full-Stack Software Engineer",
    summary:
      "Led front-end and back-end delivery for the iCluster Web product with Angular, Tailwind CSS and Spring Boot, from Figma prototypes through release.",
    impact:
      "Planned and executed the Angular 13 → 15 upgrade (risk assessment, dependency adaptation, performance), and packaged Keycloak authentication with JHipster and Spring Boot so other business systems could integrate in fewer steps.",
    technologies: ["Angular", "Tailwind CSS", "Spring Boot", "Keycloak"],
  },
  {
    name: "Dynamic forms and ABP component library",
    company: "Dalian Innocellence Technology Co., Ltd.",
    period: "2020.07 — 2022.04",
    role: "Full-Stack Software Engineer",
    summary:
      "Built dynamic form capability with Angular, NG-ZORRO, RxJS, NestJS and TypeORM, plus reusable component libraries on top of ABP and AstraZeneca clinic mini-program and PC features.",
    impact:
      "Owned effort estimation, task allocation, code review and onboarding for new team members, alongside hands-on delivery.",
    technologies: ["Angular", "NG-ZORRO", "RxJS", "NestJS", "TypeORM"],
  },
  {
    name: "IDC infrastructure platform",
    company: "Beijing JD Shangke Information Technology Co., Ltd.",
    period: "2017.09 — 2019.11",
    role: "Front-End Software Engineer",
    summary:
      "Rebuilt an internal IDC operations platform from zero with Vue.js, covering 80+ pages and around 100,000 lines of front-end code.",
    impact:
      "Built the idc-cli scaffold and page-level analytics used across the team, and designed the work-order module for decoupling so several developers could work in parallel.",
    technologies: ["Vue.js", "JavaScript", "Scaffold", "Analytics"],
  },
  {
    name: "Driver-side campaigns and mini programs",
    company: "Beijing Didi Infinity Technology Development Co., Ltd.",
    period: "2019.11 — 2020.07",
    role: "Senior Front-End Software Engineer",
    summary:
      "Delivered driver-facing promotional H5 pages and WeChat mini programs on the MPX framework, working directly with the design team.",
    impact:
      "Reached roughly 99% design and interaction fidelity, and upgraded the team's shared Vue CLI plugins for @vue/cli 4 compatibility.",
    technologies: ["Vue", "H5", "MPX", "WeChat Mini Program"],
  },
];
