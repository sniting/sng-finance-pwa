let spendingPieChart = null;

export function initChart() {
  const canvas = document.getElementById('spendingPieChart');
  if (!canvas || !window.Chart) return;
  const ctx = canvas.getContext('2d');
  spendingPieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{ label: 'Spending', data: [], backgroundColor: [], borderColor: ['#FFFFFF'], borderWidth: 2 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 15, font: { size: 11 } }
        }
      },
      cutout: '65%'
    }
  });
}

export function updateChart(labels, data, colors) {
  if (!spendingPieChart || !spendingPieChart.data) return;
  spendingPieChart.data.labels = labels;
  spendingPieChart.data.datasets[0].data = data;
  spendingPieChart.data.datasets[0].backgroundColor = colors;
  spendingPieChart.update();
}
