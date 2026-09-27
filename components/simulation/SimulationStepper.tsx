import React from "react";

interface StepperProps {
  currentStep?: number;
}

export function SimulationStepper({ currentStep = 2 }: StepperProps) {
  const steps = [
    { num: "01", label: "Repository" },
    { num: "02", label: "Mutation" },
    { num: "03", label: "Isolation" },
    { num: "04", label: "Results" },
  ];

  return (
    <div className="bg-surface-container-low px-3 py-1.5 rounded-lg flex items-center gap-2 border border-surface-container-high/40 text-xs font-mono">
      {steps.map((step, idx) => {
        const isActive = currentStep === idx + 1;
        const isDone = currentStep > idx + 1;

        return (
          <React.Fragment key={step.num}>
            <div className={`flex items-center gap-1.5 ${isActive ? "text-on-surface font-semibold" : isDone ? "text-secondary font-medium" : "text-outline"}`}>
              <span
                className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-mono ${
                  isActive
                    ? "bg-primary text-on-primary font-bold"
                    : isDone
                    ? "bg-secondary-container/40 text-secondary"
                    : "bg-surface-container text-outline"
                }`}
              >
                {isDone ? "✓" : step.num}
              </span>
              <span className="hidden sm:inline-block">{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <span className="text-outline-variant text-[11px]">→</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
