"use client";

interface AnimatedRiskScoreProps {
  score: number;
  risk: "high" | "medium" | "low";
  size?: "small" | "large";
}

export function AnimatedRiskScore({ score, risk, size = "large" }: AnimatedRiskScoreProps) {
  const getColor = () => {
    switch (risk) {
      case "high": return { ring: "stroke-red-500", text: "text-red-600", bg: "bg-red-50", label: "Hohes Risiko" };
      case "medium": return { ring: "stroke-orange-500", text: "text-orange-600", bg: "bg-orange-50", label: "Mittleres Risiko" };
      case "low": return { ring: "stroke-teal-500", text: "text-teal-600", bg: "bg-teal-50", label: "Niedriges Risiko" };
    }
  };
  
  const colors = getColor();
  
  if (size === "small") {
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (score / 100) * circumference;
    return (
      <div className={`relative inline-flex flex-col items-center justify-center`}>
        <div className={`relative w-24 h-24 ${colors.bg} rounded-full flex items-center justify-center`}>
          <svg className="absolute w-full h-full -rotate-90">
            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-200" />
            <circle
              cx="48"
              cy="48"
              r="40"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={`${colors.ring} transition-all duration-1000 ease-out`}
            />
          </svg>
          <div className="text-center z-10">
            <span className={`text-xl font-bold ${colors.text}`}>{score}%</span>
          </div>
        </div>
        <span className={`mt-2 text-xs font-semibold ${colors.text}`}>{colors.label}</span>
      </div>
    );
  }
  
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative inline-flex flex-col items-center justify-center`}>
      <div className={`relative w-36 h-36 ${colors.bg} rounded-full flex items-center justify-center`}>
        <svg className="absolute w-full h-full -rotate-90">
          <circle cx="72" cy="72" r="54" stroke="currentColor" strokeWidth="10" fill="none" className="text-gray-200" />
          <circle
            cx="72"
            cy="72"
            r="54"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${colors.ring} transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="text-center z-10">
          <span className={`text-3xl font-bold ${colors.text}`}>{score}%</span>
        </div>
      </div>
      <span className={`mt-3 text-sm font-semibold ${colors.text}`}>{colors.label}</span>
    </div>
  );
}

export default AnimatedRiskScore;
