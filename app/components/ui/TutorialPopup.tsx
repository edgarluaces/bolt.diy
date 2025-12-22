import { useState } from 'react';

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  stepIndicator?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: '1. Selecciona la IA y el modelo',
    description:
      'Elige el proveedor de IA (OpenAI, Anthropic, Google, etc.) y el modelo que quieras usar desde el menú de configuración.',
    icon: 'i-ph:brain-duotone',
    stepIndicator: 'Paso 1 de 6',
  },
  {
    title: '2. Introduce tu clave API',
    description: 'Añade tu clave API del proveedor seleccionado. Puedes obtenerla desde la web oficial del proveedor.',
    icon: 'i-ph:key-duotone',
    stepIndicator: 'Paso 2 de 6',
  },
  {
    title: '3. Escribe tu idea',
    description:
      'Describe lo que quieres crear en el chat. Por ejemplo: "Crea una web para una cafetería" o "Haz una app de tareas con React".',
    icon: 'i-ph:chat-circle-text-duotone',
    stepIndicator: 'Paso 3 de 6',
  },
  {
    title: '4. Observa la magia',
    description:
      'La IA generará el código automáticamente. Verás los archivos creándose en tiempo real en el panel de código.',
    icon: 'i-ph:magic-wand-duotone',
    stepIndicator: 'Paso 4 de 6',
  },
  {
    title: '5. Vista previa',
    description:
      'Una vez generado el código, el servidor se inicia automáticamente y podrás ver tu proyecto funcionando en la vista previa.',
    icon: 'i-ph:eye-duotone',
    stepIndicator: 'Paso 5 de 6',
  },
  {
    title: '¡Listo!',
    description: '¡Ya sabes todo lo necesario para empezar a crear! Pulsa Finalizar para comenzar.',
    icon: 'i-ph:confetti-duotone',
    stepIndicator: 'Paso 6 de 6',
  },
  {
    title: '¡Listo!',
    description: '¡Ya sabes todo lo necesario para empezar a crear! Pulsa Finalizar para comenzar.',
    icon: 'i-ph:confetti-duotone',
    stepIndicator: 'Paso 6 de 6',
  },
];

interface TutorialPopupProps {
  isOpen: boolean;
  onClose: () => void;
  inline?: boolean;
}

export function TutorialPopup({ isOpen, onClose, inline = false }: TutorialPopupProps) {
  const [showFullTutorial, setShowFullTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) {
    return null;
  }

  const handleStartTutorial = () => {
    setShowFullTutorial(true);
    setCurrentStep(0);
  };

  const handleNext = () => {
    setCurrentStep((prev) => {
      if (prev < TUTORIAL_STEPS.length - 1) {
        return prev + 1;
      }

      return prev;
    });
  };

  const handlePrev = () => {
    setCurrentStep((prev) => {
      if (prev > 0) {
        return prev - 1;
      }

      return prev;
    });
  };

  const handleClose = () => {
    setShowFullTutorial(false);
    setCurrentStep(0);
    onClose();
  };

  const currentTutorialStep = TUTORIAL_STEPS[currentStep];

  // Small initial popup (positioned below button when inline)
  if (!showFullTutorial) {
    if (inline) {
      return (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50">
          <div className="bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-xl shadow-2xl p-4 w-72 relative animate-popup-appear">
            {/* Arrow pointing up */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-bolt-elements-background-depth-2 border-l border-t border-bolt-elements-borderColor rotate-45" />

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-bolt-elements-item-contentAccent/10 flex items-center justify-center">
                <span className="i-ph:graduation-cap-duotone text-xl text-bolt-elements-item-contentAccent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-bolt-elements-textPrimary text-sm">Tutorial de cómo utilizar</h3>
                <p className="text-xs text-bolt-elements-textSecondary mt-0.5">
                  ¿Quieres aprender a usar la plataforma?
                </p>
              </div>
              <button
                onClick={handleClose}
                className="flex-shrink-0 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary transition-colors"
              >
                <span className="i-ph:x text-lg" />
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleClose}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 transition"
              >
                Ahora no
              </button>
              <button
                onClick={handleStartTutorial}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-bolt-elements-item-contentAccent text-white hover:opacity-90 transition"
              >
                Ver tutorial
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Non-inline centered popup (fallback)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto animate-fade-in-up">
          <div className="bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-xl shadow-2xl p-4 w-72 relative">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-bolt-elements-item-contentAccent/10 flex items-center justify-center">
                <span className="i-ph:graduation-cap-duotone text-xl text-bolt-elements-item-contentAccent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-bolt-elements-textPrimary text-sm">Tutorial de cómo utilizar</h3>
                <p className="text-xs text-bolt-elements-textSecondary mt-0.5">
                  ¿Quieres aprender a usar la plataforma?
                </p>
              </div>
              <button
                onClick={handleClose}
                className="flex-shrink-0 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary transition-colors"
              >
                <span className="i-ph:x text-lg" />
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleClose}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 transition"
              >
                Ahora no
              </button>
              <button
                onClick={handleStartTutorial}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-bolt-elements-item-contentAccent text-white hover:opacity-90 transition"
              >
                Ver tutorial
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full tutorial modal
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      {/* Popup */}
      <div
        className="relative bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-2xl shadow-2xl w-[90%] max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary transition-colors"
        >
          <span className="i-ph:x text-xl" />
        </button>

        <div className="p-8">
          {/* Progress bar - show only first 6 steps */}
          <div className="flex gap-1.5 mb-6">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-bolt-elements-item-contentAccent' : 'bg-bolt-elements-borderColor'
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-bolt-elements-item-contentAccent/10 mb-5">
              <span className={`${currentTutorialStep.icon} text-4xl text-bolt-elements-item-contentAccent`} />
            </div>
            <h3 className="text-xl font-bold text-bolt-elements-textPrimary mb-3">{currentTutorialStep.title}</h3>
            <p className="text-bolt-elements-textSecondary leading-relaxed max-w-md mx-auto">
              {currentTutorialStep.description}
            </p>
          </div>

          {/* Step indicator */}
          {currentTutorialStep.stepIndicator && (
            <div className="text-center text-sm text-bolt-elements-textTertiary mb-6">
              {currentTutorialStep.stepIndicator}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 justify-center">
            {currentStep > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="px-5 py-2.5 rounded-xl border border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 transition inline-flex items-center gap-2"
              >
                <span className="i-ph:arrow-left" />
                Anterior
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();

                if (currentStep < TUTORIAL_STEPS.length - 1) {
                  handleNext();
                } else {
                  handleClose();
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-bolt-elements-item-contentAccent text-white hover:opacity-90 transition shadow-lg inline-flex items-center gap-2"
            >
              {currentStep < TUTORIAL_STEPS.length - 1 ? (
                <>
                  Siguiente
                  <span className="i-ph:arrow-right" />
                </>
              ) : (
                <>
                  <span className="i-ph:check" />
                  Finalizar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TutorialPopup;
