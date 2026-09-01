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
  /**
   * Words that hint at this tag without settling it, matched at a fraction of
   * the strength of a real alias.
   *
   * "Funding" was a full alias of `scholarships-grants`, so a startup funding
   * toolkit profiled as being exactly as much about scholarships as about
   * entrepreneurship — and `expandRelated` then pushed that phantom into
   * `research-academic` and `international-programs`. The word is still
   * evidence; it is just not proof, and the same is true of "online",
   * "international", "investment" and "challenge".
   */
  weakAliases?: Partial<Record<SupportedLanguage, string[]>>
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
      en: ["scholarship", "scholarships", "grant", "grants", "bursary", "bursaries", "financial aid", "tuition", "stipend", "fully funded"],
      fr: ["bourse", "bourses", "bourse d'etudes", "subvention", "subventions", "aide financiere", "frais de scolarite", "entierement financee"],
      es: ["beca", "becas", "subvencion", "subvenciones", "ayuda financiera", "matricula", "totalmente financiada"],
      pt: ["bolsa", "bolsas", "bolsa de estudos", "subvencao", "auxilio financeiro", "mensalidade", "totalmente financiada"],
    },
    // Every startup raises "funding" too — see `weakAliases` above.
    weakAliases: {
      en: ["funding", "funded"],
      fr: ["financement"],
      es: ["financiacion"],
      pt: ["financiamento"],
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
      en: ["entrepreneurship", "entrepreneur", "startup", "startups", "founder", "incubator", "accelerator", "venture capital", "seed funding", "pitch deck", "pitch competition", "small business"],
      fr: ["entrepreneuriat", "entrepreneur", "startup", "fondateur", "incubateur", "accelerateur", "capital risque", "amorcage", "levee de fonds", "petite entreprise"],
      es: ["emprendimiento", "emprendedor", "startup", "fundador", "incubadora", "aceleradora", "capital riesgo", "capital semilla", "pequena empresa"],
      pt: ["empreendedorismo", "empreendedor", "startup", "fundador", "incubadora", "aceleradora", "capital de risco", "capital semente", "pequena empresa"],
    },
    // "Pitch" is a sports field and a sales call; "investment" belongs as much
    // to `business-finance`. Both stay as hints, with the specific phrases
    // ("pitch deck", "capital semente") carrying the real weight above.
    weakAliases: {
      en: ["pitch", "investment", "investor", "investors"],
      fr: ["investissement", "investisseur"],
      es: ["inversion", "inversionista"],
      pt: ["investimento", "investidor"],
    },
  },
  {
    id: "remote-digital-skills",
    label: "Remote Work & Digital Skills",
    category: "interest",
    related: ["technology", "jobs-careers"],
    aliases: {
      en: ["remote", "remote work", "work from home", "digital skills", "freelance", "telecommute", "distributed team"],
      fr: ["teletravail", "a distance", "travail a distance", "competences numeriques", "freelance"],
      es: ["remoto", "teletrabajo", "trabajo remoto", "habilidades digitales", "freelance"],
      pt: ["remoto", "teletrabalho", "trabalho remoto", "habilidades digitais", "freelancer"],
    },
    // Almost every resource on the platform is "online". Left as a hint so an
    // online course stops reading as a remote-work listing.
    weakAliases: {
      en: ["online", "virtual", "hybrid"],
      fr: ["en ligne", "virtuel", "hybride"],
      es: ["en linea", "virtual", "hibrido"],
      pt: ["online", "virtual", "hibrido"],
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
      en: ["exchange", "abroad", "study abroad", "mobility", "visa", "erasmus", "global program", "overseas"],
      fr: ["echange", "a l'etranger", "etudes a l'etranger", "mobilite", "visa", "erasmus", "programme mondial"],
      es: ["intercambio", "en el extranjero", "estudiar en el extranjero", "movilidad", "visa", "erasmus", "programa global"],
      pt: ["intercambio", "no exterior", "estudar no exterior", "mobilidade", "visto", "erasmus", "programa global"],
    },
    // Half the listings on the platform describe themselves as international.
    weakAliases: {
      en: ["international", "global"],
      fr: ["international", "mondial"],
      es: ["internacional", "mundial"],
      pt: ["internacional", "mundial"],
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
      en: ["government", "public service", "public policy", "civic", "governance", "diplomacy", "public sector", "united nations"],
      fr: ["gouvernement", "service public", "politique publique", "civique", "gouvernance", "diplomatie", "secteur public", "nations unies"],
      es: ["gobierno", "servicio publico", "politica publica", "civico", "gobernanza", "diplomacia", "sector publico", "naciones unidas"],
      pt: ["governo", "servico publico", "politica publica", "civico", "governanca", "diplomacia", "setor publico", "nacoes unidas"],
    },
    // "Administration" was a full alias, so a reader who studied Business
    // Administration was scored as interested in the public sector.
    weakAliases: {
      en: ["administration", "administrative"],
      fr: ["administration", "administratif"],
      es: ["administracion", "administrativo"],
      pt: ["administracao", "administrativo"],
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
      en: ["competition", "contest", "hackathon", "award", "prize", "pitch competition", "call for applications"],
      fr: ["concours", "competition", "hackathon", "prix", "appel a candidatures"],
      es: ["competencia", "concurso", "hackathon", "premio", "convocatoria"],
      pt: ["competicao", "concurso", "hackathon", "premio", "chamada de inscricoes"],
    },
    // "Challenge" is as often a hardship as a contest.
    weakAliases: {
      en: ["challenge"],
      fr: ["defi"],
      es: ["desafio", "reto"],
      pt: ["desafio"],
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
      const lists = [tag.aliases[language], tag.weakAliases?.[language] ?? []]
      for (const list of lists) {
        for (const alias of list) {
          const words = normalizeText(alias).split(" ").filter(Boolean).length
          if (words > max) max = words
        }
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

/** The same two indexes for `weakAliases`, matched at a fraction of the strength. */
export const WEAK_PHRASE_INDEX = new Map<string, string[]>()
export const WEAK_TOKEN_INDEX = new Map<string, string[]>()

function addTo(index: Map<string, string[]>, key: string, tagId: string): void {
  if (!key) return
  const existing = index.get(key)
  if (existing) {
    if (!existing.includes(tagId)) existing.push(tagId)
  } else {
    index.set(key, [tagId])
  }
}

function indexAliases(
  aliases: string[] | undefined,
  language: SupportedLanguage,
  tagId: string,
  phrases: Map<string, string[]>,
  tokens: Map<string, string[]>,
): void {
  if (!aliases) return
  for (const alias of aliases) {
    const normalized = normalizeText(alias)
    if (!normalized) continue
    const words = normalized.split(" ")
    if (words.length > 1) {
      addTo(phrases, normalized, tagId)
    } else {
      addTo(tokens, stem(words[0], language), tagId)
      // Also index the unstemmed form — cheap, and covers stems that the
      // light ruleset leaves alone in one language but strips in another.
      addTo(tokens, words[0], tagId)
    }
  }
}

for (const tag of TAXONOMY) {
  // The canonical id and label are themselves matchable.
  addTo(TOKEN_INDEX, stem(tag.id.replace(/-/g, " ").split(" ")[0]), tag.id)

  for (const language of SUPPORTED_LANGUAGES) {
    indexAliases(tag.aliases[language], language, tag.id, PHRASE_INDEX, TOKEN_INDEX)
    indexAliases(
      tag.weakAliases?.[language],
      language,
      tag.id,
      WEAK_PHRASE_INDEX,
      WEAK_TOKEN_INDEX,
    )
  }
}

/**
 * Evidence contributed by one match, before saturation.
 *
 * Phrases score higher than single words because "capital semente" is far more
 * specific than "capital", and a stemmed match scores below an exact one
 * because stemming can over-collapse.
 */
const PHRASE_HIT = 1.5
const TOKEN_HIT = 1
const STEMMED_HIT = 0.8
const WEAK_PHRASE_HIT = 0.5
const WEAK_TOKEN_HIT = 0.35

/**
 * How fast evidence saturates. Tuned so one exact single-word hit lands near
 * 0.75 and a matched phrase near 0.88.
 *
 * The old curve — `1 - 1/(1 + count)` over a 0.6 hit — put a single exact match
 * at 0.375, which is why `semanticSimilarity` could not clear 0.46 even for an
 * ideal match, and why the 0.55 reason threshold never fired. A listing whose
 * title says "Scholarships" *is* about scholarships; the score should say so.
 */
const SATURATION_TAU = 0.72

/** One tag's evidence in a piece of text. */
export type TagMatch = {
  /** 0..1 strength for this text alone, before any field weighting. */
  strength: number
  /**
   * True when nothing but `weakAliases` supported this tag.
   *
   * Callers must not let field weighting lift such a tag to full strength.
   * "Startup Funding Toolkit: Seed Funding …" says "funding" twice in a title
   * weighted 3, which was enough to push `scholarships-grants` past the clamp
   * and out the far side as a certainty.
   */
  weakOnly: boolean
}

/**
 * Tag ids present in `text` with their evidence.
 *
 * Repeat mentions add sub-linearly — a listing that says "scholarship" nine
 * times is not nine times more about scholarships.
 */
export function matchTagsDetailed(
  text: string,
  language?: SupportedLanguage,
): Map<string, TagMatch> {
  const strong = new Map<string, number>()
  const weak = new Map<string, number>()
  const scored = new Map<string, TagMatch>()

  const normalized = normalizeText(text)
  if (!normalized) return scored

  const words = normalized.split(" ").filter(Boolean)
  if (words.length === 0) return scored

  const bump = (into: Map<string, number>, tagId: string, amount: number) => {
    into.set(tagId, (into.get(tagId) ?? 0) + amount)
  }

  // Phrases first — a matched phrase is strong evidence.
  if (MAX_PHRASE_WORDS > 1) {
    for (const gram of ngrams(words, MAX_PHRASE_WORDS)) {
      const tagIds = PHRASE_INDEX.get(gram)
      if (tagIds) {
        for (const tagId of tagIds) bump(strong, tagId, PHRASE_HIT)
      }
      const weakIds = WEAK_PHRASE_INDEX.get(gram)
      if (weakIds) {
        for (const tagId of weakIds) bump(weak, tagId, WEAK_PHRASE_HIT)
      }
    }
  }

  for (const word of words) {
    const stemmedWord = stem(word, language)

    const direct = TOKEN_INDEX.get(word)
    if (direct) {
      for (const tagId of direct) bump(strong, tagId, TOKEN_HIT)
    } else {
      const stemmed = TOKEN_INDEX.get(stemmedWord)
      if (stemmed) {
        for (const tagId of stemmed) bump(strong, tagId, STEMMED_HIT)
      }
    }

    // Weak aliases are scored independently of the strong ones: a word can be
    // a firm alias of one tag and a hint at another.
    const hinted = WEAK_TOKEN_INDEX.get(word) ?? WEAK_TOKEN_INDEX.get(stemmedWord)
    if (hinted) {
      for (const tagId of hinted) bump(weak, tagId, WEAK_TOKEN_HIT)
    }
  }

  // Squash counts into 0..1 so a long description cannot outscore a precise one.
  for (const tagId of new Set([...strong.keys(), ...weak.keys()])) {
    const count = (strong.get(tagId) ?? 0) + (weak.get(tagId) ?? 0)
    scored.set(tagId, {
      strength: 1 - Math.exp(-count / SATURATION_TAU),
      weakOnly: !strong.has(tagId),
    })
  }
  return scored
}

/** Tag ids present in `text`, each with a 0..1 strength. */
export function matchTags(
  text: string,
  language?: SupportedLanguage,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const [tagId, match] of matchTagsDetailed(text, language)) {
    out.set(tagId, match.strength)
  }
  return out
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
