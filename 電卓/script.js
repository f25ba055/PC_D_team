const display = document.getElementById('display');
const buttons = document.querySelectorAll('.buttons button');

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    const val = button.dataset.val;

    if (button.id === 'clear') {
      display.value = '';
    } else if (button.id === 'equals') {
      calculate();
    } else if (val) {
      display.value += val;
    }
  });
});

function calculate() {
  try {
    const sanitized = display.value.replace(/[^0-9+\-*/.]/g, '');
    if (!sanitized) return;

    const result = new Function('return ' + sanitized)();
    display.value = Number.isFinite(result) ? result : 'エラー';
  } catch {
    display.value = 'エラー';
  }
}