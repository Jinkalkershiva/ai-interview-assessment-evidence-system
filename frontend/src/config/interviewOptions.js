/**
 * Centralized configuration for interview setup options.
 * Defines categorized job roles, experience levels, interview types, question counts, and algorithm topics.
 */

export const JOB_ROLES = [
  // ─── TECHNOLOGY ─────────────────────────────────────────────────────────
  { id: 'se', label: 'Software Engineer', category: 'Technology', keywords: ['software', 'developer', 'engineer', 'coding', 'programming', 'swe'] },
  { id: 'java', label: 'Java Developer', category: 'Technology', keywords: ['java', 'spring', 'springboot', 'backend', 'jvm', 'j2ee'] },
  { id: 'java_backend', label: 'Java Backend Developer', category: 'Technology', keywords: ['java', 'backend', 'spring', 'microservices', 'api', 'rest'] },
  { id: 'java_fullstack', label: 'Java Full Stack Developer', category: 'Technology', keywords: ['java', 'fullstack', 'spring', 'react', 'angular', 'web'] },
  { id: 'python', label: 'Python Developer', category: 'Technology', keywords: ['python', 'django', 'fastapi', 'flask', 'scripting'] },
  { id: 'python_backend', label: 'Python Backend Developer', category: 'Technology', keywords: ['python', 'backend', 'django', 'fastapi', 'rest', 'api'] },
  { id: 'js', label: 'JavaScript Developer', category: 'Technology', keywords: ['javascript', 'js', 'frontend', 'web', 'es6'] },
  { id: 'ts', label: 'TypeScript Developer', category: 'Technology', keywords: ['typescript', 'ts', 'javascript', 'frontend', 'backend'] },
  { id: 'react', label: 'React Developer', category: 'Technology', keywords: ['react', 'reactjs', 'frontend', 'web', 'ui', 'javascript', 'redux'] },
  { id: 'angular', label: 'Angular Developer', category: 'Technology', keywords: ['angular', 'frontend', 'web', 'typescript'] },
  { id: 'vue', label: 'Vue.js Developer', category: 'Technology', keywords: ['vue', 'vuejs', 'frontend', 'web', 'javascript'] },
  { id: 'node', label: 'Node.js Developer', category: 'Technology', keywords: ['node', 'nodejs', 'express', 'backend', 'javascript', 'api'] },
  { id: 'php', label: 'PHP Developer', category: 'Technology', keywords: ['php', 'laravel', 'backend', 'wordpress', 'symfony'] },
  { id: 'dotnet', label: '.NET Developer', category: 'Technology', keywords: ['.net', 'dotnet', 'c#', 'csharp', 'asp.net', 'microsoft'] },
  { id: 'cpp', label: 'C++ Developer', category: 'Technology', keywords: ['c++', 'cpp', 'systems', 'embedded', 'algorithms'] },
  { id: 'c', label: 'C Developer', category: 'Technology', keywords: ['c', 'embedded', 'kernel', 'firmware', 'low-level'] },
  { id: 'go', label: 'Go Developer', category: 'Technology', keywords: ['go', 'golang', 'backend', 'concurrency', 'microservices'] },
  { id: 'rust', label: 'Rust Developer', category: 'Technology', keywords: ['rust', 'systems', 'backend', 'memory-safe', 'concurrency'] },
  { id: 'mobile', label: 'Mobile Developer', category: 'Technology', keywords: ['mobile', 'app', 'android', 'ios', 'smartphone'] },
  { id: 'android', label: 'Android Developer', category: 'Technology', keywords: ['android', 'kotlin', 'java', 'mobile', 'apps'] },
  { id: 'ios', label: 'iOS Developer', category: 'Technology', keywords: ['ios', 'swift', 'apple', 'mobile', 'apps', 'xcode'] },
  { id: 'flutter', label: 'Flutter Developer', category: 'Technology', keywords: ['flutter', 'dart', 'cross-platform', 'mobile'] },

  // ─── BACKEND / CLOUD / DEVOPS ──────────────────────────────────────────
  { id: 'backend', label: 'Backend Developer', category: 'Backend / Cloud / DevOps', keywords: ['backend', 'server', 'database', 'api', 'microservices', 'sql'] },
  { id: 'frontend', label: 'Frontend Developer', category: 'Backend / Cloud / DevOps', keywords: ['frontend', 'ui', 'css', 'html', 'javascript', 'web', 'react'] },
  { id: 'fullstack', label: 'Full Stack Developer', category: 'Backend / Cloud / DevOps', keywords: ['fullstack', 'full-stack', 'frontend', 'backend', 'web', 'mern'] },
  { id: 'api_dev', label: 'API Developer', category: 'Backend / Cloud / DevOps', keywords: ['api', 'rest', 'graphql', 'grpc', 'backend', 'microservices'] },
  { id: 'devops', label: 'DevOps Engineer', category: 'Backend / Cloud / DevOps', keywords: ['devops', 'ci/cd', 'docker', 'kubernetes', 'cloud', 'jenkins', 'automation'] },
  { id: 'cloud_eng', label: 'Cloud Engineer', category: 'Backend / Cloud / DevOps', keywords: ['cloud', 'aws', 'azure', 'gcp', 'infrastructure', 'devops'] },
  { id: 'cloud_arch', label: 'Cloud Architect', category: 'Backend / Cloud / DevOps', keywords: ['cloud', 'architect', 'aws', 'azure', 'gcp', 'solutions', 'system design'] },
  { id: 'cloud_sol', label: 'Cloud Solutions Engineer', category: 'Backend / Cloud / DevOps', keywords: ['cloud', 'solutions', 'aws', 'azure', 'gcp', 'architecture', 'consulting'] },
  { id: 'devops_cloud', label: 'DevOps / Cloud Engineer', category: 'Backend / Cloud / DevOps', keywords: ['devops', 'cloud', 'aws', 'azure', 'kubernetes', 'terraform'] },
  { id: 'sre', label: 'Site Reliability Engineer', category: 'Backend / Cloud / DevOps', keywords: ['sre', 'reliability', 'devops', 'monitoring', 'incident', 'sla'] },
  { id: 'platform_eng', label: 'Platform Engineer', category: 'Backend / Cloud / DevOps', keywords: ['platform', 'internal developer platform', 'kubernetes', 'infrastructure'] },
  { id: 'infra_eng', label: 'Infrastructure Engineer', category: 'Backend / Cloud / DevOps', keywords: ['infrastructure', 'cloud', 'servers', 'networking', 'iac', 'terraform'] },
  { id: 'k8s_eng', label: 'Kubernetes Engineer', category: 'Backend / Cloud / DevOps', keywords: ['kubernetes', 'k8s', 'containers', 'docker', 'devops', 'cloud'] },
  { id: 'network_eng', label: 'Network Engineer', category: 'Backend / Cloud / DevOps', keywords: ['network', 'networking', 'cisco', 'routers', 'switches', 'firewalls'] },
  { id: 'sysadmin', label: 'System Administrator', category: 'Backend / Cloud / DevOps', keywords: ['sysadmin', 'system administrator', 'linux', 'windows server', 'it'] },

  // ─── DATA / AI ─────────────────────────────────────────────────────────
  { id: 'data_eng', label: 'Data Engineer', category: 'Data / AI', keywords: ['data', 'etl', 'pipeline', 'spark', 'sql', 'bigquery', 'hadoop', 'data warehouse'] },
  { id: 'data_analyst', label: 'Data Analyst', category: 'Data / AI', keywords: ['data', 'analyst', 'sql', 'tableau', 'powerbi', 'excel', 'reporting', 'analytics'] },
  { id: 'data_scientist', label: 'Data Scientist', category: 'Data / AI', keywords: ['data', 'scientist', 'python', 'machine learning', 'statistics', 'modeling'] },
  { id: 'data_arch', label: 'Data Architect', category: 'Data / AI', keywords: ['data', 'architect', 'modeling', 'data warehouse', 'lakehouse', 'schema'] },
  { id: 'ml_eng', label: 'Machine Learning Engineer', category: 'Data / AI', keywords: ['machine learning', 'ml', 'ai', 'deep learning', 'pytorch', 'tensorflow', 'model'] },
  { id: 'ai_eng', label: 'AI Engineer', category: 'Data / AI', keywords: ['ai', 'artificial intelligence', 'genai', 'llm', 'nlp', 'openai', 'prompt'] },
  { id: 'ml_short', label: 'ML Engineer', category: 'Data / AI', keywords: ['ml', 'machine learning', 'ai', 'data science', 'algorithms'] },
  { id: 'mlops', label: 'MLOps Engineer', category: 'Data / AI', keywords: ['mlops', 'ml', 'deployment', 'kubeflow', 'mlflow', 'devops', 'model serving'] },
  { id: 'bi_analyst', label: 'Business Intelligence Analyst', category: 'Data / AI', keywords: ['bi', 'business intelligence', 'data', 'tableau', 'power bi', 'dashboard', 'analytics'] },
  { id: 'analytics_eng', label: 'Analytics Engineer', category: 'Data / AI', keywords: ['analytics', 'dbt', 'sql', 'data modeling', 'snowflake', 'warehouse'] },

  // ─── SECURITY / QUALITY ────────────────────────────────────────────────
  { id: 'cybersecurity', label: 'Cybersecurity Engineer', category: 'Security / Quality', keywords: ['security', 'cybersecurity', 'infosec', 'penetration testing', 'soc'] },
  { id: 'sec_analyst', label: 'Security Analyst', category: 'Security / Quality', keywords: ['security', 'analyst', 'threat', 'vulnerability', 'compliance', 'soc'] },
  { id: 'sec_eng', label: 'Security Engineer', category: 'Security / Quality', keywords: ['security', 'appsec', 'devsecops', 'cryptography', 'network security'] },
  { id: 'infosec', label: 'Information Security Analyst', category: 'Security / Quality', keywords: ['infosec', 'security', 'iso27001', 'governance', 'risk', 'compliance'] },
  { id: 'qa_eng', label: 'QA Engineer', category: 'Security / Quality', keywords: ['qa', 'test', 'quality assurance', 'testing', 'bug', 'manual testing'] },
  { id: 'test_eng', label: 'Test Engineer', category: 'Security / Quality', keywords: ['test', 'testing', 'qa', 'validation', 'quality'] },
  { id: 'auto_qa', label: 'Automation Test Engineer', category: 'Security / Quality', keywords: ['automation', 'qa', 'selenium', 'cypress', 'playwright', 'testing', 'test'] },
  { id: 'qa_analyst', label: 'QA Analyst', category: 'Security / Quality', keywords: ['qa', 'analyst', 'quality', 'test cases', 'jira'] },

  // ─── PRODUCT / MANAGEMENT ─────────────────────────────────────────────
  { id: 'pm', label: 'Product Manager', category: 'Product / Management', keywords: ['product', 'pm', 'roadmap', 'feature', 'user stories', 'agile'] },
  { id: 'po', label: 'Product Owner', category: 'Product / Management', keywords: ['product', 'owner', 'scrum', 'agile', 'backlog', 'jira'] },
  { id: 'project_mgr', label: 'Project Manager', category: 'Product / Management', keywords: ['project', 'pmp', 'timeline', 'delivery', 'budget', 'milestones'] },
  { id: 'program_mgr', label: 'Program Manager', category: 'Product / Management', keywords: ['program', 'cross-functional', 'leadership', 'strategy', 'execution'] },
  { id: 'em', label: 'Engineering Manager', category: 'Product / Management', keywords: ['engineering manager', 'em', 'tech lead', 'leadership', 'management', 'people'] },
  { id: 'tpm', label: 'Technical Program Manager', category: 'Product / Management', keywords: ['tpm', 'technical', 'program', 'engineering', 'architecture'] },
  { id: 'ops_mgr', label: 'Operations Manager', category: 'Product / Management', keywords: ['operations', 'ops', 'process', 'efficiency', 'logistics'] },

  // ─── BUSINESS / NON-TECHNICAL ─────────────────────────────────────────
  { id: 'ba', label: 'Business Analyst', category: 'Business / Non-Technical', keywords: ['business', 'analyst', 'ba', 'requirements', 'process', 'stakeholders'] },
  { id: 'bdm', label: 'Business Development Manager', category: 'Business / Non-Technical', keywords: ['business development', 'bdm', 'sales', 'growth', 'partnerships'] },
  { id: 'sales_mgr', label: 'Sales Manager', category: 'Business / Non-Technical', keywords: ['sales', 'quota', 'pipeline', 'revenue', 'crm', 'leads'] },
  { id: 'sales_exec', label: 'Sales Executive', category: 'Business / Non-Technical', keywords: ['sales', 'executive', 'deals', 'closing', 'prospecting', 'cold calling'] },
  { id: 'sales_eng', label: 'Sales Engineer', category: 'Business / Non-Technical', keywords: ['sales engineer', 'technical sales', 'solutions consultant', 'demo', 'pre-sales'] },
  { id: 'account_mgr', label: 'Account Manager', category: 'Business / Non-Technical', keywords: ['sales', 'account', 'client', 'relationship', 'retention', 'upselling'] },
  { id: 'csm', label: 'Customer Success Manager', category: 'Business / Non-Technical', keywords: ['csm', 'customer success', 'onboarding', 'retention', 'nps', 'churn'] },
  { id: 'ops_exec', label: 'Operations Executive', category: 'Business / Non-Technical', keywords: ['operations', 'execution', 'administration', 'workflow'] },
  { id: 'fin_analyst', label: 'Financial Analyst', category: 'Business / Non-Technical', keywords: ['finance', 'financial', 'excel', 'modeling', 'accounting', 'valuation'] },
  { id: 'hr_mgr', label: 'HR Manager', category: 'Business / Non-Technical', keywords: ['hr', 'human resources', 'recruitment', 'employee relations', 'culture'] },
  { id: 'hr_exec', label: 'HR Executive', category: 'Business / Non-Technical', keywords: ['hr', 'human resources', 'operations', 'payroll', 'onboarding'] },
  { id: 'recruiter', label: 'Recruiter', category: 'Business / Non-Technical', keywords: ['hr', 'recruiter', 'recruiting', 'talent', 'sourcing', 'hiring', 'interviewing'] },
  { id: 'talent_acq', label: 'Talent Acquisition Specialist', category: 'Business / Non-Technical', keywords: ['hr', 'talent acquisition', 'ta', 'recruiter', 'hiring', 'talent'] },
  { id: 'marketing_mgr', label: 'Marketing Manager', category: 'Business / Non-Technical', keywords: ['marketing', 'campaigns', 'growth', 'seo', 'branding', 'digital marketing'] },
  { id: 'marketing_exec', label: 'Marketing Executive', category: 'Business / Non-Technical', keywords: ['marketing', 'social media', 'content', 'email marketing', 'ads'] },
  { id: 'content_writer', label: 'Content Writer', category: 'Business / Non-Technical', keywords: ['content', 'writer', 'copywriting', 'blog', 'seo', 'editing'] },
  { id: 'tech_writer', label: 'Technical Writer', category: 'Business / Non-Technical', keywords: ['technical writer', 'documentation', 'api docs', 'manuals', 'confluence'] },
  { id: 'uiux', label: 'UI/UX Designer', category: 'Business / Non-Technical', keywords: ['ui', 'ux', 'designer', 'figma', 'wireframes', 'prototyping', 'user research'] },
  { id: 'graphic_designer', label: 'Graphic Designer', category: 'Business / Non-Technical', keywords: ['graphic', 'designer', 'photoshop', 'illustrator', 'branding', 'visual'] },
];

/**
 * Smart fuzzy/token search helper for roles.
 * Matches on label, category, and keywords case-insensitively with accurate word boundary scoring.
 *
 * @param {string} query
 * @param {number} limit
 * @returns {Array<typeof JOB_ROLES[0]>}
 */
export function searchJobRoles(query, limit = 8) {
  if (!query || !query.trim()) return [];
  
  const q = query.trim().toLowerCase();
  const qIsShort = q.length <= 2;
  const scored = [];

  for (const role of JOB_ROLES) {
    const labelLower = role.label.toLowerCase();
    const labelWords = labelLower.split(/[\s/\\-]+/).filter(Boolean);
    const keywords = (role.keywords || []).map(k => k.toLowerCase());

    let score = 0;

    // 1. Exact label match
    if (labelLower === q) {
      score = 100;
    }
    // 2. Label starts with query
    else if (labelLower.startsWith(q)) {
      score = 90;
    }
    // 3. Any word in the label starts with query
    else if (labelWords.some(w => w.startsWith(q))) {
      // Prioritize pure Java over JavaScript when querying 'java'
      if (q === 'java' && labelLower.includes('javascript')) {
        score = 40;
      } else {
        score = 80;
      }
    }
    // 4. Exact keyword match
    else if (keywords.some(k => k === q)) {
      score = 70;
    }
    // 5. Keyword word starts with query (avoid javascript when querying java)
    else if (keywords.some(k => {
      if (q === 'java' && k.includes('javascript')) return false;
      return k.split(/[\s/\\-]+/).some(w => w.startsWith(q));
    })) {
      score = 60;
    }
    // 6. Substring match for longer queries only (length >= 3, avoid javascript for java)
    else if (!qIsShort && labelLower.includes(q)) {
      if (q === 'java' && labelLower.includes('javascript')) {
        score = 30;
      } else {
        score = 50;
      }
    }
    // 7. Keyword substring match for longer queries
    else if (!qIsShort && keywords.some(k => k.includes(q))) {
      score = 30;
    }

    if (score > 0) {
      scored.push({ role, score });
    }
  }

  // Sort by score descending, then alphabetically by label
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.role.label.localeCompare(b.role.label);
  });

  return scored.slice(0, limit).map(item => item.role);
}

export const EXPERIENCE_LEVELS = [
  { id: 'fresher', label: 'Fresher', value: 'Fresher', description: '0–1 yr exp', badge: 'Entry' },
  { id: 'intermediate', label: 'Intermediate', value: 'Intermediate', description: '2–4 yrs exp', badge: 'Mid' },
  { id: 'senior', label: 'Senior', value: 'Senior', description: '5–8 yrs exp', badge: 'Sr' },
  { id: 'lead', label: 'Lead / Principal', value: 'Lead', description: '8+ yrs exp', badge: 'Lead' },
];

export const INTERVIEW_TYPES = [
  { 
    id: 'Mixed', 
    label: 'Mixed', 
    value: 'Mixed', 
    description: 'Balanced technical & behavioral evaluation',
    badge: 'Popular'
  },
  { 
    id: 'Technical', 
    label: 'Technical', 
    value: 'Technical', 
    description: 'Deep-dive domain architecture and implementation',
    badge: 'In-Depth'
  },
  { 
    id: 'HR', 
    label: 'HR / Behavioral', 
    value: 'HR', 
    description: 'Culture fit, communication, and situational handling',
    badge: 'Soft Skills'
  },
  { 
    id: 'Coding', 
    label: 'Coding Challenge', 
    value: 'Coding', 
    description: 'Live interactive coding with execution and AI review',
    badge: 'Hands-on'
  },
];

export const QUESTION_COUNTS = [
  { label: '3', value: '3', duration: '~10 min' },
  { label: '5', value: '5', duration: '~20 min' },
  { label: '8', value: '8', duration: '~35 min' },
  { label: '10', value: '10', duration: '~45 min' },
];

export const CODING_PROBLEM_COUNTS = [
  { label: '1 Problem', value: '1', duration: '~30 min' },
  { label: '2 Problems', value: '2', duration: '~60 min' },
];

export const CODING_FOCUS_TOPICS = [
  'Arrays, Strings, HashMap',
  'Two Pointers & Sliding Window',
  'Trees & Graphs',
  'Dynamic Programming',
  'Stack & Queue',
  'Greedy & Sorting',
];
