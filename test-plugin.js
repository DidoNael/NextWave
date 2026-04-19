const playwright = require('playwright');

(async () => {
  console.log("=== Iniciando teste do Grafana Plugin no NextWave CRM ===");
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("[1] Acessando /login...");
    await page.goto('http://localhost:3010/login');
    
    // Login
    console.log("[2] Preenchendo login admin@nextwave.com...");
    await page.fill('input[type="email"]', 'admin@nextwave.com');
    await page.fill('input[type="password"]', 'Admin1234!');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    const urlAfterLogin = page.url();
    console.log("[3] URL após login:", urlAfterLogin);

    // Extrair orgSlug da URL se possivel
    let orgSlug = "nextwave";
    const match = urlAfterLogin.match(/http:\/\/localhost:3010\/([^\/]+)\/dashboard/);
    if (match) orgSlug = match[1];

    console.log(`[4] Acessando configurações de licença: /${orgSlug}/configuracoes/plugin-licenses...`);
    const res = await page.goto(`http://localhost:3010/${orgSlug}/configuracoes/plugin-licenses`);
    console.log(`Status HTTP: ${res.status()}`);
    
    if (res.status() === 404 || res.status() >= 500) {
      console.log("❌ ERRO: A página Plugin-Licenses retornou erro " + res.status());
    } else {
      console.log("✅ Página Plugin-Licenses acessada. Tirando screenshot...");
      await page.screenshot({ path: 'plugin-licenses.png' });
    }

    // Criar nova licença
    try {
      console.log("[5] Tentando criar uma nova licença...");
      await page.click('button:has-text("Nova Licença")');
      await page.waitForTimeout(1000);
      await page.fill('input[placeholder="Ex: Empresa ABC Ltda"]', 'Cliente Teste Grafana');
      await page.click('button:has-text("Criar Licença")');
      await page.waitForTimeout(2000);
      console.log("Ação de criar licença concluída.");
      await page.screenshot({ path: 'plugin-licenses-after.png' });
    } catch(e) {
      console.log("❌ ERRO ao manipular a interface de licenças:", e.message);
    }

    // Acessando Servicos
    console.log(`[6] Acessando Serviços: /${orgSlug}/servicos...`);
    const res2 = await page.goto(`http://localhost:3010/${orgSlug}/servicos`);
    console.log(`Status HTTP Serviços: ${res2.status()}`);
    
  } catch (error) {
    console.error("Erro no teste:", error);
  } finally {
    await browser.close();
  }
})();
