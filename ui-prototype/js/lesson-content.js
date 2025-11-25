// SmartTutor - Dynamic Lesson Content
// Loads appropriate lesson based on URL parameters

// Lesson content library (simulating AI-generated lessons)
const lessonLibrary = {
    'Biology-Photosynthesis': {
        emoji: '🧬',
        subject: 'Biology',
        topic: 'Photosynthesis',
        difficulty: 'medium',
        estimatedTime: '15 minutes',
        sections: {
            introduction: "Photosynthesis is the process by which green plants use sunlight to make their own food. It's one of the most important processes on Earth because it produces oxygen and food for nearly all living organisms.",
            keyConcepts: [
                {
                    title: "The Photosynthesis Equation",
                    content: "Plants use carbon dioxide (CO₂) from the air, water (H₂O) from the soil, and energy from sunlight to create glucose (C₆H₁₂O₆) and oxygen (O₂). The equation is: 6CO₂ + 6H₂O + Light Energy → C₆H₁₂O₆ + 6O₂"
                },
                {
                    title: "Chloroplasts and Chlorophyll",
                    content: "Photosynthesis happens in special structures called chloroplasts, which contain a green pigment called chlorophyll. This pigment absorbs light energy, particularly red and blue wavelengths, which is why plants appear green to our eyes."
                },
                {
                    title: "Two Stages of Photosynthesis",
                    content: "Photosynthesis occurs in two stages: the light-dependent reactions (which capture light energy) and the light-independent reactions or Calvin Cycle (which use that energy to make glucose from CO₂)."
                }
            ],
            examples: [
                "A tree in your backyard is performing photosynthesis right now, converting sunlight into the sugars it needs to grow and produce oxygen for you to breathe.",
                "Ocean phytoplankton, tiny plant-like organisms, produce more than half of Earth's oxygen through photosynthesis.",
                "Without photosynthesis, there would be no food chains, as plants form the base of nearly all ecosystems on Earth."
            ],
            summary: "Photosynthesis is the process where plants use sunlight, carbon dioxide, and water to create glucose and oxygen. It happens in chloroplasts containing chlorophyll and involves two main stages. This process is essential for life on Earth.",
            checkQuestions: [
                "What are the three main inputs needed for photosynthesis?",
                "Where in the plant cell does photosynthesis occur?",
                "Why do plants appear green?"
            ]
        }
    },

    'Mathematics-Fractions & Decimals': {
        emoji: '📐',
        subject: 'Mathematics',
        topic: 'Fractions & Decimals',
        difficulty: 'easy',
        estimatedTime: '12 minutes',
        sections: {
            introduction: "Fractions and decimals are two different ways to represent parts of a whole. Understanding how they relate to each other is an important math skill that you'll use throughout your life.",
            keyConcepts: [
                {
                    title: "What is a Fraction?",
                    content: "A fraction represents a part of a whole. It has two parts: the numerator (top number) tells you how many parts you have, and the denominator (bottom number) tells you how many equal parts make up the whole. For example, 3/4 means you have 3 out of 4 equal parts."
                },
                {
                    title: "What is a Decimal?",
                    content: "A decimal is another way to show parts of a whole, using a decimal point. The digits to the right of the decimal point represent tenths, hundredths, thousandths, and so on. For example, 0.75 means 75 hundredths."
                },
                {
                    title: "Converting Between Fractions and Decimals",
                    content: "To convert a fraction to a decimal, divide the numerator by the denominator. For example, 1/4 = 1 ÷ 4 = 0.25. To convert a decimal to a fraction, write it as a fraction over a power of 10 and simplify. For example, 0.5 = 5/10 = 1/2."
                }
            ],
            examples: [
                "If you eat 1/2 of a pizza, that's the same as eating 0.5 (or 50%) of the pizza.",
                "When measuring ingredients for a recipe, 3/4 cup is the same as 0.75 cups.",
                "If you score 0.85 on a test, that means you got 85/100 questions correct, which simplifies to 17/20."
            ],
            summary: "Fractions and decimals both represent parts of a whole. You can convert between them using division (fraction to decimal) or by writing over powers of 10 and simplifying (decimal to fraction). Both are useful in different situations.",
            checkQuestions: [
                "What does the numerator in a fraction tell you?",
                "How do you convert 1/2 to a decimal?",
                "What is 0.25 as a simplified fraction?"
            ]
        }
    },

    'Science-The Water Cycle': {
        emoji: '🌍',
        subject: 'Science',
        topic: 'The Water Cycle',
        difficulty: 'medium',
        estimatedTime: '15 minutes',
        sections: {
            introduction: "The water cycle describes how water continuously moves between Earth's surface and the atmosphere. This never-ending process is powered by the sun and is essential for all life on our planet.",
            keyConcepts: [
                {
                    title: "Evaporation",
                    content: "When the sun heats water in oceans, lakes, and rivers, it turns from liquid into water vapor (gas) and rises into the atmosphere. This is called evaporation. Plants also release water vapor through their leaves in a process called transpiration."
                },
                {
                    title: "Condensation",
                    content: "As water vapor rises and cools in the atmosphere, it changes back into tiny liquid water droplets. These droplets come together to form clouds. This process is called condensation."
                },
                {
                    title: "Precipitation and Collection",
                    content: "When water droplets in clouds become too heavy, they fall back to Earth as precipitation - rain, snow, sleet, or hail. This water collects in oceans, lakes, rivers, and underground, and the cycle begins again."
                }
            ],
            examples: [
                "When you see fog in the morning, you're witnessing condensation - water vapor in the air cooling and forming tiny water droplets.",
                "A puddle disappearing after rain is evaporation in action - the sun's heat is turning the liquid water into invisible water vapor.",
                "Snow on mountain tops eventually melts and flows into rivers, which carry the water back to the ocean, continuing the cycle."
            ],
            summary: "The water cycle consists of evaporation (water becoming vapor), condensation (vapor becoming droplets and clouds), and precipitation (water falling back to Earth). This cycle is powered by the sun and continuously moves water around our planet.",
            checkQuestions: [
                "What causes water to evaporate?",
                "What happens during condensation?",
                "Name three forms of precipitation."
            ]
        }
    },

    'History-American Revolution': {
        emoji: '📜',
        subject: 'History',
        topic: 'American Revolution',
        difficulty: 'hard',
        estimatedTime: '20 minutes',
        sections: {
            introduction: "The American Revolution (1775-1783) was a pivotal conflict between thirteen American colonies and Great Britain that resulted in the formation of the United States of America. This revolution was driven by complex political, economic, and philosophical factors that fundamentally changed the course of world history.",
            keyConcepts: [
                {
                    title: "Causes of the Revolution",
                    content: "Multiple factors led to the revolution: the colonies had no representation in British Parliament ('taxation without representation'), Britain imposed heavy taxes after the French and Indian War (Stamp Act, Tea Act), and Enlightenment ideas about natural rights and self-governance influenced colonial thinking. The Boston Massacre (1770) and Boston Tea Party (1773) were catalyzing events."
                },
                {
                    title: "Key Events and Turning Points",
                    content: "The revolution began with the Battles of Lexington and Concord in April 1775. The Declaration of Independence was adopted on July 4, 1776. Critical turning points included the Battle of Saratoga (1777), which convinced France to ally with America, and the final victory at Yorktown (1781) when British General Cornwallis surrendered."
                },
                {
                    title: "Founding Principles and Legacy",
                    content: "The revolution established democratic principles including popular sovereignty, individual rights, and limited government. The Declaration of Independence proclaimed that all men are created equal with unalienable rights to life, liberty, and the pursuit of happiness. However, these ideals were not initially extended to enslaved people or women, creating contradictions that would take centuries to address."
                }
            ],
            examples: [
                "The 'shot heard 'round the world' at Lexington marked the beginning of armed conflict, but ideological battles had been fought through pamphlets like Thomas Paine's 'Common Sense' for years.",
                "George Washington's crossing of the Delaware River on Christmas night 1776 demonstrated strategic brilliance and turned the tide after months of defeats.",
                "The alliance with France brought crucial military and financial support, including the French navy that helped trap Cornwallis at Yorktown, demonstrating the revolution's global significance."
            ],
            summary: "The American Revolution resulted from growing tensions over taxation, representation, and governance. Through military conflict and Enlightenment ideals, the thirteen colonies achieved independence and established a new nation based on democratic principles. This revolution influenced future democratic movements worldwide, though its promises of equality would require ongoing struggle to fulfill.",
            checkQuestions: [
                "What did 'taxation without representation' mean to the colonists?",
                "Why was the Battle of Saratoga considered a turning point?",
                "What contradictions existed in the revolutionary ideals of equality?"
            ]
        }
    },

    'English-Grammar Basics': {
        emoji: '📖',
        subject: 'English',
        topic: 'Grammar Basics',
        difficulty: 'easy',
        estimatedTime: '12 minutes',
        sections: {
            introduction: "Grammar is the set of rules that helps us communicate clearly in English. Understanding basic grammar helps you speak and write more effectively, making it easier for others to understand your ideas.",
            keyConcepts: [
                {
                    title: "Parts of Speech",
                    content: "Every word in English belongs to a category called a 'part of speech.' The main ones are: nouns (person, place, or thing), verbs (action or state of being), adjectives (describe nouns), adverbs (describe verbs), pronouns (replace nouns), prepositions (show relationships), conjunctions (connect words), and interjections (express emotion)."
                },
                {
                    title: "Sentence Structure",
                    content: "A complete sentence needs two things: a subject (who or what the sentence is about) and a predicate (what the subject does or is). For example, in 'The dog barked,' 'dog' is the subject and 'barked' is the predicate. Sentences can be simple, compound, or complex."
                },
                {
                    title: "Common Grammar Rules",
                    content: "Subject-verb agreement means the subject and verb must match in number (singular or plural). Pronouns must agree with their antecedents. Capitalization rules include starting sentences and proper nouns with capital letters. Punctuation marks help organize thoughts and show how to read sentences."
                }
            ],
            examples: [
                "Noun example: 'Sarah went to school.' (Sarah and school are nouns)",
                "Verb example: 'The cat jumped over the fence.' (jumped is the action verb)",
                "Subject-verb agreement: 'The dog runs' is correct, but 'The dog run' is incorrect because singular subject needs singular verb."
            ],
            summary: "Grammar basics include understanding parts of speech, sentence structure (subject and predicate), and common rules like subject-verb agreement. Mastering these fundamentals helps you communicate clearly in both writing and speaking.",
            checkQuestions: [
                "What are the two essential parts of a complete sentence?",
                "Name three parts of speech and give an example of each.",
                "Why is 'The dogs runs' grammatically incorrect?"
            ]
        }
    },

    'Chemistry-Atoms & Molecules': {
        emoji: '⚗️',
        subject: 'Chemistry',
        topic: 'Atoms & Molecules',
        difficulty: 'medium',
        estimatedTime: '15 minutes',
        sections: {
            introduction: "Everything in the universe is made of matter, and all matter is composed of tiny particles called atoms. Understanding atoms and how they combine to form molecules is fundamental to understanding chemistry and the world around us.",
            keyConcepts: [
                {
                    title: "Structure of an Atom",
                    content: "An atom consists of three main particles: protons (positive charge) and neutrons (no charge) in the nucleus at the center, and electrons (negative charge) orbiting the nucleus in shells or energy levels. The number of protons determines what element the atom is."
                },
                {
                    title: "Elements and the Periodic Table",
                    content: "An element is a pure substance made of only one type of atom. Each element has a unique atomic number (number of protons). The periodic table organizes all known elements by their atomic number and properties. For example, hydrogen (H) has 1 proton, while oxygen (O) has 8 protons."
                },
                {
                    title: "Molecules and Chemical Bonds",
                    content: "When two or more atoms join together, they form a molecule. Atoms bond together by sharing or transferring electrons. Water (H₂O) is a molecule made of 2 hydrogen atoms and 1 oxygen atom. Chemical bonds can be covalent (sharing electrons) or ionic (transferring electrons)."
                }
            ],
            examples: [
                "A water molecule (H₂O) forms when two hydrogen atoms each share an electron with one oxygen atom, creating covalent bonds.",
                "Table salt (NaCl) is made when sodium (Na) transfers an electron to chlorine (Cl), forming an ionic bond.",
                "Diamond and graphite are both made entirely of carbon atoms, but they have different properties because the atoms are arranged differently."
            ],
            summary: "Atoms are the basic building blocks of matter, containing protons, neutrons, and electrons. Elements are made of one type of atom. Molecules form when atoms bond together by sharing or transferring electrons. Understanding atomic structure helps explain the properties and behaviors of all substances.",
            checkQuestions: [
                "What are the three main particles in an atom?",
                "What determines which element an atom is?",
                "What is the difference between an atom and a molecule?"
            ]
        }
    }
};

// Function to get URL parameters
function getURLParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Function to load lesson content dynamically
function loadLesson() {
    const subject = getURLParameter('subject') || 'Biology';
    const topic = getURLParameter('topic') || 'Photosynthesis';
    const key = `${subject}-${topic}`;

    // Get lesson data or use photosynthesis as default
    const lesson = lessonLibrary[key] || lessonLibrary['Biology-Photosynthesis'];

    // Update page title
    document.title = `SmartTutor - Lesson: ${lesson.topic}`;

    // Update breadcrumb
    const breadcrumb = document.querySelector('.breadcrumb-subject');
    if (breadcrumb) {
        breadcrumb.textContent = lesson.subject;
    }
    const breadcrumbTopic = document.querySelector('.breadcrumb-topic');
    if (breadcrumbTopic) {
        breadcrumbTopic.textContent = lesson.topic;
    }

    // Update lesson info bar
    const lessonTitle = document.querySelector('.lesson-title');
    if (lessonTitle) {
        lessonTitle.textContent = `${lesson.emoji} ${lesson.topic}`;
    }

    const lessonSubject = document.querySelector('.lesson-subject');
    if (lessonSubject) {
        lessonSubject.textContent = lesson.subject;
    }

    const difficultyBadge = document.querySelector('.lesson-difficulty');
    if (difficultyBadge) {
        difficultyBadge.textContent = `${lesson.difficulty.charAt(0).toUpperCase() + lesson.difficulty.slice(1)} Level`;
        difficultyBadge.className = `difficulty-badge difficulty-${lesson.difficulty} lesson-difficulty`;
    }

    const estimatedTime = document.querySelector('.lesson-time');
    if (estimatedTime) {
        estimatedTime.textContent = `⏱️ Estimated time: ${lesson.estimatedTime}`;
    }

    // Update lesson sections
    const introSection = document.querySelector('.intro-content');
    if (introSection) {
        introSection.textContent = lesson.sections.introduction;
    }

    // Update key concepts
    const conceptsContainer = document.querySelector('.concepts-container');
    if (conceptsContainer) {
        conceptsContainer.innerHTML = lesson.sections.keyConcepts.map(concept => `
            <div class="concept-item">
                <h4>${concept.title}</h4>
                <p>${concept.content}</p>
            </div>
        `).join('');
    }

    // Update examples
    const examplesContainer = document.querySelector('.examples-container');
    if (examplesContainer) {
        examplesContainer.innerHTML = lesson.sections.examples.map((example, index) => `
            <div class="example-item">
                <strong>Example ${index + 1}:</strong> ${example}
            </div>
        `).join('');
    }

    // Update summary
    const summaryContent = document.querySelector('.summary-content');
    if (summaryContent) {
        summaryContent.textContent = lesson.sections.summary;
    }

    // Update check questions
    const questionsContainer = document.querySelector('.questions-container');
    if (questionsContainer) {
        questionsContainer.innerHTML = lesson.sections.checkQuestions.map((question, index) => `
            <div class="question-item">
                <span class="question-number">${index + 1}.</span>
                <span>${question}</span>
            </div>
        `).join('');
    }
}

// Load lesson when page loads
document.addEventListener('DOMContentLoaded', loadLesson);
