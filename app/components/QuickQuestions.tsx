"use client";

interface QuickQuestionsProps {
  onQuestionClick: (question: string) => void;
  customQuestions?: string[];
}

const RESEARCH_CATEGORIES = [
  {
    title: "GRUNDLAGEN",
    questions: [
      "Was ist überhaupt eine Marke?",
      "Wofür brauche ich eine Marke?",
      "Was ist der Unterschied zwischen Wortmarke und Bildmarke?",
      "Was ist eine Nizza-Klassifikation?",
    ],
  },
  {
    title: "MARKENRECHERCHE",
    questions: [
      "Wozu dient die Markenrecherche?",
      "Wo und wie wird die Markenrecherche durchgeführt?",
      "Können Sie für mich Markenrecherche durchführen?",
      "Was passiert, wenn ich keine Markenrecherche mache?",
    ],
  },
  {
    title: "MARKENPRÜFUNG",
    questions: [
      "Wozu dient die Markenprüfung?",
      "Wo und wie wird die Markenprüfung durchgeführt?",
      "Was kostet die Markenprüfung?",
    ],
  },
  {
    title: "MARKENVERLÄNGERUNG",
    questions: [
      "Wie lange gilt eine Marke?",
      "Kann ich meine Marke später erweitern oder ändern?",
      "Was kostet die Markenverlängerung?",
    ],
  },
];

export default function QuickQuestions({ onQuestionClick, customQuestions }: QuickQuestionsProps) {
  if (customQuestions && customQuestions.length > 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200" data-tour="quick-questions">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Schnellfragen
        </h4>
        <div className="flex flex-wrap gap-2">
          {customQuestions.map((question, idx) => (
            <button
              key={idx}
              onClick={() => onQuestionClick(question)}
              className="text-sm py-2 px-3 rounded-lg transition-all duration-200 border bg-white hover:bg-primary/10 text-gray-700 hover:text-primary border-gray-200 hover:border-primary/30 cursor-pointer"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-sm shadow-sm p-5 border border-gray-200 h-full" data-tour="quick-questions">
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        Schnellfragen
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Klicken Sie auf eine Frage, um sie direkt zu stellen:
      </p>
      
      <div className="space-y-5 max-h-96 overflow-y-auto custom-scrollbar pr-2">
        {RESEARCH_CATEGORIES.map((category, catIndex) => (
          <div key={catIndex}>
            <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
              {category.title}
            </h4>
            <div className="space-y-1.5">
              {category.questions.map((question, qIndex) => (
                <button
                  key={qIndex}
                  onClick={() => onQuestionClick(question)}
                  className="w-full text-left text-sm py-2.5 px-3 rounded-sm transition-all duration-200 border bg-gray-50 hover:bg-primary/10 text-gray-700 hover:text-primary border-gray-200 hover:border-primary/30 cursor-pointer"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
