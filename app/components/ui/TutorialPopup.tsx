import { useState } from 'react';

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: '1. Escribe tu idea',
    description:
      'Describe lo que quieres crear en el chat. Por ejemplo: "Crea una landing page para una cafetería" o "Haz una app de tareas con React".',
    icon: 'i-ph:chat-circle-text-duotone',
  },
  {
    title: '2. Observa la magia',
    description:
      'La IA generará el código automáticamente. Verás los archivos creándose en tiempo real en el panel de código.',
    icon: 'i-ph:magic-wand-duotone',
  },
  {
    title: '3. Vista previa instantánea',
    description:
      'El servidor se inicia automáticamente y podrás ver tu proyecto funcionando en la vista previa del lado derecho.',
    icon: 'i-ph:eye-duotone',
  },
  {
    title: '4. Itera y mejora',
    description:
      'Pide cambios en el chat: "Cambia el color a azul", "Añade un formulario de contacto". La IA modificará el código al instante.',
    icon: 'i-ph:arrows-clockwise-duotone',
  },
  {
    title: '5. Guarda y despliega',
    description: 'Exporta tu proyecto a GitHub o despliega directamente a Netlify o Vercel con un solo clic.',
    icon: 'i-ph:rocket-launch-duotone',
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
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Popup */}
      <div className="relative bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-2xl shadow-2xl w-[90%] max-w-2xl animate-fade-in-up">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary transition-colors"
        >
          <span className="i-ph:x text-xl" />
        </button>

        <div className="p-8">
          {/* Progress bar */}
          <div className="flex gap-1.5 mb-6">
            {TUTORIAL_STEPS.map((_, index) => (
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
          <div className="text-center text-sm text-bolt-elements-textTertiary mb-6">
            Paso {currentStep + 1} de {TUTORIAL_STEPS.length}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3 justify-center">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-5 py-2.5 rounded-xl border border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 transition inline-flex items-center gap-2"
              >
                <span className="i-ph:arrow-left" />
                Anterior
              </button>
            )}
            <button
              onClick={handleNext}
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
                  ¡Entendido!
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
