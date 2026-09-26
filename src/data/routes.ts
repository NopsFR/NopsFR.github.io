// Single source of truth for per-route identity: section index, label and
// accent. Used by Layout (sets data-accent on <html>) and by the page
// transition (so the scene takes on the destination's colour and name).
export type Accent = 'red' | 'cyan' | 'blue' | 'gold' | 'green' | 'magenta';

export interface RouteMeta {
  index: string;
  label: string;
  accent: Accent;
}

const ROUTES: Record<string, RouteMeta> = {
  '': { index: '01', label: 'Home', accent: 'red' },
  projects: { index: '02', label: 'Projects', accent: 'cyan' },
  credentials: { index: '03', label: 'Credentials', accent: 'gold' },
  'learning-log': { index: '04', label: 'Learning Log', accent: 'green' },
  about: { index: '05', label: 'About', accent: 'magenta' },
};

const PROJECT_ACCENTS: Record<string, Accent> = {
  'nops-cyber-intelligence': 'blue',
};

export function routeMeta(pathname: string, base = '/'): RouteMeta {
  const rel = (pathname.startsWith(base) ? pathname.slice(base.length) : pathname).replace(/^\/+|\/+$/g, '');
  const [first = '', second] = rel.split('/');
  if (first === 'projects' && second) {
    return { index: '02.1', label: 'Case study', accent: PROJECT_ACCENTS[second] ?? 'red' };
  }
  return ROUTES[first] ?? { index: '00', label: 'Not found', accent: 'red' };
}
