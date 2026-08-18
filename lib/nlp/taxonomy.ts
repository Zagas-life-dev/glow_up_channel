/**
 * The tag vocabulary, and every way the four languages say each tag.
 *
 * This is what makes cross-language ranking work without translating anything.
 * A user whose profile says "Entrepreneurship & Funding" and a Portuguese
 * listing that says "capital semente" both resolve to the tag
 * `entrepreneurship-funding`, so they match — no translation API, no embeddings.
 *
 * The `id`s on the first nine entries deliberately mirror the interest values
 * `transformOnboardingData` already writes, and the industry entries mirror its
 * sector values, so existing profiles resolve without a migration.
 *
 * Aliases are written accented and natural; they are normalized at index time,
 * so "inscrição" is stored as "inscricao" and matches text either way.
 */

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/nlp/detect-language"
import { normalizeText, ngrams } from "@/lib/nlp/normalize"
import { stem } from "@/lib/nlp/stem"

export type TagCategory = "interest" | "industry" | "format" | "audience" | "support"

export type TagDefinition = {
  id: string
  /** English display label. UI strings live in the i18n dictionaries. */
  label: string
  category: TagCategory
  aliases: Record<SupportedLanguage, string[]>
  /** Tags that partially satisfy this one, scored at `RELATED_WEIGHT`. */
  related?: string[]
}

export const TAXONOMY: TagDefinition[] = [
  {
    id: "jobs-careers",
    label: "Jobs & Career Opportunities",
    category: "interest",
    related: ["remote-digital-skills", "skill-development"],
    aliases: {
      en: ["job", "jobs", "career", "careers", "employment", "hiring", "vacancy", "vacancies", "position", "recruitment", "full time", "part time", "graduate role"],
      fr: ["emploi", "emplois", "carriere", "carrieres", "poste", "recrutement", "embauche", "offre d'emploi", "travail", "temps plein", "temps partiel"],
      es: ["empleo", "empleos", "trabajo", "carrera", "carreras", "puesto", "vacante", "vacantes", "contratacion", "reclutamiento", "tiempo completo"],
      pt: ["emprego", "empregos", "trabalho", "carreira", "carreiras", "vaga", "vagas", "recrutamento", "contratacao", "tempo integral"],
    },
  },
  {
    id: "scholarships-grants",
    label: "Scholarships & Grants",
    category: "interest",
    related: ["research-academic", "international-programs"],
    aliases: {
      en: ["scholarship", "scholarships", "grant", "grants", "bursary", "bursaries", "funding", "financial aid", "tuition", "stipend", "fully funded"],
      fr: ["bourse", "bourses", "bourse d'etudes", "subvention", "subventions", "financement", "aide financiere", "frais de scolarite", "entierement financee"],
      es: ["beca", "becas", "subvencion", "subvenciones", "financiacion", "ayuda financiera", "matricula", "totalmente financiada"],
      pt: ["bolsa", "bolsas", "bolsa de estudos", "subvencao", "financiamento", "auxilio financeiro", "mensalidade", "totalmente financiada"],
    },
  },
  {
    id: "training-workshops",
    label: "Training & Workshops",
    category: "interest",
    related: ["skill-development", "education-training"],
    aliases: {
      en: ["training", "workshop", "workshops", "bootcamp", "course", "courses", "masterclass", "seminar", "certification", "upskilling", "short course"],
      fr: ["formation", "formations", "atelier", "ateliers", "cours", "seminaire", "certification", "perfectionnement", "stage de formation"],
      es: ["formacion", "capacitacion", "taller", "talleres", "curso", "cursos", "seminario", "certificacion", "perfeccionamiento"],
      pt: ["formacao", "capacitacao", "treinamento", "oficina", "curso", "cursos", "seminario", "certificacao", "aperfeicoamento"],
    },
  },
  {
    id: "networking-events",
    label: "Networking Events",
    category: "interest",
    related: ["mentorship"],
    aliases: {
      en: ["networking", "meetup", "conference", "summit", "forum", "mixer", "symposium", "convention", "expo"],
      fr: ["reseautage", "rencontre", "conference", "sommet", "forum", "colloque", "salon", "congres"],
      es: ["networking", "encuentro", "conferencia", "cumbre", "foro", "congreso", "simposio", "feria"],
      pt: ["networking", "encontro", "conferencia", "cupula", "forum", "congresso", "simposio", "feira"],
    },
  },
  {
    id: "volunteering",
    label: "Volunteering & Community Service",
    category: "interest",
    related: ["government-public"],
    aliases: {
      en: ["volunteer", "volunteering", "community service", "ngo", "nonprofit", "non profit", "charity", "social impact", "humanitarian"],
      fr: ["benevolat", "benevole", "volontariat", "service communautaire", "ong", "association", "impact social", "humanitaire"],
      es: ["voluntariado", "voluntario", "servicio comunitario", "ong", "sin fines de lucro", "impacto social", "humanitario"],
      pt: ["voluntariado", "voluntario", "servico comunitario", "ong", "sem fins lucrativos", "impacto social", "humanitario"],
    },
  },
  {
    id: "entrepreneurship-funding",
    label: "Entrepreneurship & Funding",
    category: "interest",
    related: ["business-finance", "competition"],
    aliases: {
      en: ["entrepreneurship", "entrepreneur", "startup", "startups", "founder", "incubator", "accelerator", "venture capital", "seed funding", "pitch", "investment", "small business"],
      fr: ["entrepreneuriat", "entrepreneur", "startup", "fondateur", "incubateur", "accelerateur", "capital risque", "amorcage", "levee de fonds", "investissement", "petite entreprise"],
      es: ["emprendimiento", "emprendedor", "startup", "fundador", "incubadora", "aceleradora", "capital riesgo", "capital semilla", "inversion", "pequena empresa"],
      pt: ["empreendedorismo", "empreendedor", "startup", "fundador", "incubadora", "aceleradora", "capital de risco", "capital semente", "investimento", "pequena empresa"],
    },
  },
  {
    id: "remote-digital-skills",
    label: "Remote Work & Digital Skills",
    category: "interest",
    related: ["technology", "jobs-careers"],
    aliases: {
      en: ["remote", "remote work", "work from home", "digital skills", "freelance", "telecommute", "online", "virtual", "hybrid", "distributed team"],
      fr: ["teletravail", "a distance", "travail a distance", "competences numeriques", "freelance", "en ligne", "virtuel", "hybride"],
      es: ["remoto", "teletrabajo", "trabajo remoto", "habilidades digitales", "freelance", "en linea", "virtual", "hibrido"],
      pt: ["remoto", "teletrabalho", "trabalho remoto", "habilidades digitais", "freelancer", "online", "virtual", "hibrido"],
    },
  },
  {
    id: "research-academic",
    label: "Research & Academic Opportunities",
    category: "interest",
    related: ["scholarships-grants", "education-training", "fellowship"],
    aliases: {
      en: ["research", "academic", "phd", "doctorate", "postdoc", "thesis", "dissertation", "laboratory", "publication", "call for papers"],
      fr: ["recherche", "academique", "doctorat", "these", "postdoctoral", "laboratoire", "publication", "appel a communications"],
      es: ["investigacion", "academico", "doctorado", "tesis", "posdoctoral", "laboratorio", "publicacion", "convocatoria de articulos"],
      pt: ["pesquisa", "academico", "doutorado", "tese", "pos doutorado", "laboratorio", "publicacao", "chamada de trabalhos"],
    },
  },
  {
    id: "international-programs",
    label: "International Exchange Programs",
    category: "interest",
    related: ["scholarships-grants"],
    aliases: {
      en: ["exchange", "international", "abroad", "study abroad", "mobility", "visa", "erasmus", "global program", "overseas"],
      fr: ["echange", "international", "a l'etranger", "etudes a l'etranger", "mobilite", "visa", "erasmus", "programme mondial"],
      es: ["intercambio", "internacional", "en el extranjero", "estudiar en el extranjero", "movilidad", "visa", "erasmus", "programa global"],
      pt: ["intercambio", "internacional", "no exterior", "estudar no exterior", "mobilidade", "visto", "erasmus", "programa global"],
    },
  },

  {
    id: "technology",
    label: "Technology",
    category: "industry",
    related: ["remote-digital-skills"],
    aliases: {
      en: ["technology", "tech", "software", "engineering", "developer", "programming", "data science", "artificial intelligence", "machine learning", "cybersecurity", "cloud", "web development"],
      fr: ["technologie", "informatique", "logiciel", "ingenierie", "developpeur", "programmation", "science des donnees", "intelligence artificielle", "apprentissage automatique", "cybersecurite", "infonuagique"],
      es: ["tecnologia", "informatica", "software", "ingenieria", "desarrollador", "programacion", "ciencia de datos", "inteligencia artificial", "aprendizaje automatico", "ciberseguridad", "nube"],
      pt: ["tecnologia", "informatica", "software", "engenharia", "desenvolvedor", "programacao", "ciencia de dados", "inteligencia artificial", "aprendizado de maquina", "ciberseguranca", "nuvem"],
    },
  },
  {
    id: "creative-media",
    label: "Creative Arts & Media",
    category: "industry",
    aliases: {
      en: ["creative", "arts", "media", "design", "film", "music", "photography", "writing", "journalism", "content creation", "fashion", "animation"],
      fr: ["creatif", "arts", "medias", "design", "cinema", "musique", "photographie", "ecriture", "journalisme", "creation de contenu", "mode", "animation"],
      es: ["creativo", "artes", "medios", "diseno", "cine", "musica", "fotografia", "escritura", "periodismo", "creacion de contenido", "moda", "animacion"],
      pt: ["criativo", "artes", "midia", "design", "cinema", "musica", "fotografia", "escrita", "jornalismo", "criacao de conteudo", "moda", "animacao"],
    },
  },
  {
    id: "business-finance",
    label: "Business & Finance",
    category: "industry",
    related: ["entrepreneurship-funding"],
    aliases: {
      en: ["business", "finance", "banking", "accounting", "marketing", "sales", "consulting", "economics", "management", "fintech", "supply chain"],
      fr: ["affaires", "finance", "banque", "comptabilite", "marketing", "ventes", "conseil", "economie", "gestion", "chaine d'approvisionnement"],
      es: ["negocios", "finanzas", "banca", "contabilidad", "marketing", "ventas", "consultoria", "economia", "gestion", "cadena de suministro"],
      pt: ["negocios", "financas", "bancario", "contabilidade", "marketing", "vendas", "consultoria", "economia", "gestao", "cadeia de suprimentos"],
    },
  },
  {
    id: "health-sciences",
    label: "Healthcare & Sciences",
    category: "industry",
    aliases: {
      en: ["health", "healthcare", "medical", "medicine", "nursing", "public health", "biology", "chemistry", "pharmacy", "science", "biotechnology"],
      fr: ["sante", "medical", "medecine", "soins infirmiers", "sante publique", "biologie", "chimie", "pharmacie", "science", "biotechnologie"],
      es: ["salud", "sanitario", "medico", "medicina", "enfermeria", "salud publica", "biologia", "quimica", "farmacia", "ciencia", "biotecnologia"],
      pt: ["saude", "medico", "medicina", "enfermagem", "saude publica", "biologia", "quimica", "farmacia", "ciencia", "biotecnologia"],
    },
  },
  {
    id: "education-training",
    label: "Education & Training",
    category: "industry",
    related: ["training-workshops"],
    aliases: {
      en: ["education", "teaching", "teacher", "school", "university", "curriculum", "pedagogy", "e learning", "tutor", "lecturer"],
      fr: ["education", "enseignement", "enseignant", "ecole", "universite", "programme scolaire", "pedagogie", "tuteur", "professeur"],
      es: ["educacion", "ensenanza", "docente", "escuela", "universidad", "curriculo", "pedagogia", "tutor", "profesor"],
      pt: ["educacao", "ensino", "professor", "escola", "universidade", "curriculo", "pedagogia", "tutor", "docente"],
    },
  },
  {
    id: "government-public",
    label: "Government & Public Service",
    category: "industry",
    related: ["volunteering"],
    aliases: {
      en: ["government", "public service", "public policy", "civic", "governance", "diplomacy", "public sector", "administration", "united nations"],
      fr: ["gouvernement", "service public", "politique publique", "civique", "gouvernance", "diplomatie", "secteur public", "administration", "nations unies"],
      es: ["gobierno", "servicio publico", "politica publica", "civico", "gobernanza", "diplomacia", "sector publico", "administracion", "naciones unidas"],
      pt: ["governo", "servico publico", "politica publica", "civico", "governanca", "diplomacia", "setor publico", "administracao", "nacoes unidas"],
    },
  },
  {
    id: "agriculture-environment",
    label: "Agriculture & Environment",
    category: "industry",
    aliases: {
      en: ["agriculture", "farming", "agribusiness", "environment", "climate", "sustainability", "renewable energy", "conservation", "green economy"],
      fr: ["agriculture", "agroalimentaire", "environnement", "climat", "durabilite", "energie renouvelable", "conservation", "economie verte"],
      es: ["agricultura", "agronegocio", "medio ambiente", "clima", "sostenibilidad", "energia renovable", "conservacion", "economia verde"],
      pt: ["agricultura", "agronegocio", "meio ambiente", "clima", "sustentabilidade", "energia renovavel", "conservacao", "economia verde"],
    },
  },

  {
    id: "internship",
    label: "Internship",
    category: "format",
    related: ["jobs-careers", "training-workshops"],
    aliases: {
      en: ["internship", "intern", "trainee", "placement", "apprenticeship", "graduate scheme"],
      fr: ["stage", "stagiaire", "alternance", "apprentissage", "contrat de professionnalisation"],
      es: ["pasantia", "practicas", "becario", "aprendizaje", "practicas profesionales"],
      pt: ["estagio", "estagiario", "aprendizagem", "programa de trainee"],
    },
  },
  {
    id: "fellowship",
    label: "Fellowship",
    category: "format",
    related: ["research-academic", "scholarships-grants"],
    aliases: {
      en: ["fellowship", "fellow", "residency", "leadership program"],
      fr: ["bourse de recherche", "boursier", "residence", "programme de leadership"],
      es: ["beca de investigacion", "residencia", "programa de liderazgo"],
      pt: ["bolsa de pesquisa", "residencia", "programa de lideranca"],
    },
  },
  {
    id: "competition",
    label: "Competition",
    category: "format",
    related: ["entrepreneurship-funding"],
    aliases: {
      en: ["competition", "contest", "challenge", "hackathon", "award", "prize", "pitch competition", "call for applications"],
      fr: ["concours", "competition", "defi", "hackathon", "prix", "appel a candidatures"],
      es: ["competencia", "concurso", "desafio", "hackathon", "premio", "convocatoria"],
      pt: ["competicao", "concurso", "desafio", "hackathon", "premio", "chamada de inscricoes"],
    },
  },

  {
    id: "mentorship",
    label: "Mentorship & Guidance",
    category: "support",
    related: ["networking-events", "skill-development"],
    aliases: {
      en: ["mentorship", "mentor", "coaching", "guidance", "advisor", "career advice"],
      fr: ["mentorat", "mentor", "coaching", "accompagnement", "conseiller", "orientation professionnelle"],
      es: ["mentoria", "mentor", "coaching", "orientacion", "asesor", "orientacion profesional"],
      pt: ["mentoria", "mentor", "coaching", "orientacao", "conselheiro", "orientacao profissional"],
    },
  },
  {
    id: "skill-development",
    label: "Skill Development",
    category: "support",
    related: ["training-workshops"],
    aliases: {
      en: ["skill", "skills", "upskill", "professional development", "capacity building", "leadership", "soft skills"],
      fr: ["competence", "competences", "developpement professionnel", "renforcement des capacites", "leadership", "competences douces"],
      es: ["habilidad", "habilidades", "desarrollo profesional", "fortalecimiento de capacidades", "liderazgo", "habilidades blandas"],
      pt: ["habilidade", "habilidades", "desenvolvimento profissional", "capacitacao profissional", "lideranca", "habilidades interpessoais"],
    },
  },
  {
    id: "youth-women-inclusion",
    label: "Youth, Women & Inclusion",
    category: "audience",
    aliases: {
      en: ["youth", "young people", "women", "girls", "gender", "inclusion", "diversity", "underrepresented", "disability"],
      fr: ["jeunesse", "jeunes", "femmes", "filles", "genre", "inclusion", "diversite", "sous represente", "handicap"],
      es: ["juventud", "jovenes", "mujeres", "ninas", "genero", "inclusion", "diversidad", "subrepresentado", "discapacidad"],
      pt: ["juventude", "jovens", "mulheres", "meninas", "genero", "inclusao", "diversidade", "sub representado", "deficiencia"],
    },
  },
]

export const TAG_BY_ID = new Map(TAXONOMY.map((tag) => [tag.id, tag]))

/** How much of a tag's weight a `related` tag inherits. */
export const RELATED_WEIGHT = 0.4

/** Longest alias in words — the n-gram window for phrase matching. */
export const MAX_PHRASE_WORDS = (() => {
  let max = 1
  for (const tag of TAXONOMY) {
    for (const language of SUPPORTED_LANGUAGES) {
      for (const alias of tag.aliases[language]) {
        const words = normalizeText(alias).split(" ").filter(Boolean).length
        if (words > max) max = words
      }
    }
  }
  return max
})()

/**
 * Phrase → tag ids. Multi-word aliases only; matched against n-grams.
 * Single words go in `TOKEN_INDEX` instead, where stemming can help them.
 */
export const PHRASE_INDEX = new Map<string, string[]>()

/** Stemmed single word → tag ids. */
export const TOKEN_INDEX = new Map<string, string[]>()

function addTo(index: Map<string, string[]>, key: string, tagId: string): void {
  if (!key) return
  const existing = index.get(key)
  if (existing) {
    if (!existing.includes(tagId)) existing.push(tagId)
  } else {
    index.set(key, [tagId])
  }
}

for (const tag of TAXONOMY) {
  // The canonical id and label are themselves matchable.
  addTo(TOKEN_INDEX, stem(tag.id.replace(/-/g, " ").split(" ")[0]), tag.id)

  for (const language of SUPPORTED_LANGUAGES) {
    for (const alias of tag.aliases[language]) {
      const normalized = normalizeText(alias)
      if (!normalized) continue
      const words = normalized.split(" ")
      if (words.length > 1) {
        addTo(PHRASE_INDEX, normalized, tag.id)
      } else {
        addTo(TOKEN_INDEX, stem(words[0], language), tag.id)
        // Also index the unstemmed form — cheap, and covers stems that the
        // light ruleset leaves alone in one language but strips in another.
        addTo(TOKEN_INDEX, words[0], tag.id)
      }
    }
  }
}

/**
 * Tag ids present in `text`, each with a 0..1 strength.
 *
 * Phrases score higher than single words because "capital semente" is far more
 * specific than "capital". Repeat mentions add sub-linearly — a listing that
 * says "scholarship" nine times is not nine times more about scholarships.
 */
export function matchTags(
  text: string,
  language?: SupportedLanguage,
): Map<string, number> {
  const hits = new Map<string, number>()
  const normalized = normalizeText(text)
  if (!normalized) return hits

  const words = normalized.split(" ").filter(Boolean)
  if (words.length === 0) return hits

  const bump = (tagId: string, amount: number) => {
    hits.set(tagId, (hits.get(tagId) ?? 0) + amount)
  }

  // Phrases first — a matched phrase is strong evidence.
  if (MAX_PHRASE_WORDS > 1) {
    for (const gram of ngrams(words, MAX_PHRASE_WORDS)) {
      const tagIds = PHRASE_INDEX.get(gram)
      if (tagIds) {
        for (const tagId of tagIds) bump(tagId, 1)
      }
    }
  }

  for (const word of words) {
    const direct = TOKEN_INDEX.get(word)
    if (direct) {
      for (const tagId of direct) bump(tagId, 0.6)
      continue
    }
    const stemmed = TOKEN_INDEX.get(stem(word, language))
    if (stemmed) {
      for (const tagId of stemmed) bump(tagId, 0.5)
    }
  }

  // Squash counts into 0..1 so a long description cannot outscore a precise one.
  const scored = new Map<string, number>()
  for (const [tagId, count] of hits) {
    scored.set(tagId, 1 - 1 / (1 + count))
  }
  return scored
}

/**
 * Add `related` tags at reduced weight, so a "startup accelerator" listing
 * still surfaces for someone who only ticked "Business & Finance".
 */
export function expandRelated(tags: Map<string, number>): Map<string, number> {
  const expanded = new Map(tags)
  for (const [tagId, weight] of tags) {
    const related = TAG_BY_ID.get(tagId)?.related
    if (!related) continue
    for (const relatedId of related) {
      const inherited = weight * RELATED_WEIGHT
      if ((expanded.get(relatedId) ?? 0) < inherited) {
        expanded.set(relatedId, inherited)
      }
    }
  }
  return expanded
}

/** Localised label for a tag, falling back to the English one. */
export function tagLabel(tagId: string, language: SupportedLanguage): string {
  const tag = TAG_BY_ID.get(tagId)
  if (!tag) return tagId
  if (language === "en") return tag.label
  const first = tag.aliases[language]?.[0]
  if (!first) return tag.label
  return first.charAt(0).toUpperCase() + first.slice(1)
}
