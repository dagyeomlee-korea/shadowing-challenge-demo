const screens = Array.from(document.querySelectorAll(".screen"));
const dots = Array.from(document.querySelectorAll(".step-dots button"));
let activeStep = 0;

function showStep(index) {
  activeStep = Math.max(0, Math.min(index, screens.length - 1));
  screens.forEach((screen, i) => {
    screen.classList.toggle("active", i === activeStep);
  });
  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === activeStep);
  });
  if (activeStep === 1) {
    const active = document.querySelector('.screen[data-step="1"]');
    active.querySelector(".reference-preview").classList.add("hidden");
    active.querySelector(".red-points").classList.add("hidden");
    active.querySelector(".next").classList.add("hidden");
    active.querySelector(".listen-card p").textContent = "먼저 원본 억양을 들어보세요";
  }
}

document.querySelector(".reveal-feedback").addEventListener("click", () => {
  const active = document.querySelector('.screen[data-step="1"]');
  active.querySelector(".reference-preview").classList.remove("hidden");
  active.querySelector(".listen-card p").textContent = "원본 그래프를 확인하는 중";
  window.setTimeout(() => {
    active.querySelector(".red-points").classList.remove("hidden");
    active.querySelector(".next").classList.remove("hidden");
    active.querySelector(".listen-card p").textContent = "핵심 포인트 3곳 확인했어요.";
  }, 900);
});

document.querySelectorAll(".next").forEach((button) => {
  button.addEventListener("click", () => showStep(activeStep + 1));
});

document.querySelector(".restart").addEventListener("click", () => showStep(0));

dots.forEach((dot) => {
  dot.addEventListener("click", () => showStep(Number(dot.dataset.go)));
});

showStep(0);
