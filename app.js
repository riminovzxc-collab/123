const tg = window.Telegram.WebApp;
tg.expand();

function goToPricing() {
  document.getElementById('app').innerHTML = `
    <h2>Выбор тарифа</h2>

    <button onclick="pay('month')">
      1 месяц — 15 000 ₸
    </button>

    <button onclick="pay('year')">
      1 год — 120 000 ₸
    </button>
  `;
}

function pay(plan) {
  tg.sendData(JSON.stringify({
    action: "pay",
    plan: plan,
    user_id: tg.initDataUnsafe?.user?.id
  }));

  document.getElementById('app').innerHTML = `
    <h2>Оплата</h2>
    <p>После оплаты вы получите доступ</p>
    <a href="https://kaspi.kz/pay/ТВОЯ_ССЫЛКА" target="_blank">
      Оплатить через Kaspi
    </a>
  `;
}
