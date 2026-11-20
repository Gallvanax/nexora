import { expect, test } from "@playwright/test";

test.describe("NEXORA — Parcours complets & Sécurité", () => {
  test("Page publique responsive sans défilement horizontal (320 à 1920 px)", async ({ page }) => {
    const widths = [320, 375, 768, 1024, 1440, 1920];
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Organisez vos projets/i })).toBeVisible();

    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1;
      });
      expect(overflow, `Défilement horizontal détecté à ${width}px`).toBe(false);
    }
  });

  test("Bloque l'accès anonyme aux pages privées et API protégées", async ({ page, request }) => {
    const apiRes = await request.get("/api/projects");
    expect(apiRes.status()).toBe(401);

    await page.goto("/tableau-de-bord");
    await expect(page).toHaveURL(/\/connexion/);
  });

  test("Parcours utilisateur complet : inscription, projet, tâche, statut, calendrier, équipe, déconnexion", async ({
    page,
  }) => {
    const ts = Date.now();
    const email = `e2e-${ts}@nexora.local`;
    const password = "NexoraE2E#2026";

    // 1. Inscription
    await page.goto("/inscription");
    await page.getByLabel("Nom complet").fill("Éléna Test");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill(password);
    await page.getByRole("button", { name: /Créer mon espace/i }).click();

    // Redirection ou écran de lien dev
    const dashboardBtn = page.getByRole("button", { name: /Accéder au tableau de bord/i });
    if (await dashboardBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dashboardBtn.click();
    }
    await expect(page).toHaveURL(/\/tableau-de-bord/);
    await expect(page.getByText(/Bonjour, Éléna/i)).toBeVisible();

    // Inspection responsive mobile du tableau de bord (375px)
    await page.setViewportSize({ width: 375, height: 812 });
    const dashOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(dashOverflow).toBe(false);
    await page.setViewportSize({ width: 1280, height: 800 });

    // 2. Déconnexion puis Reconnexion
    await page
      .getByRole("button", { name: /Déconnexion/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/connexion/);

    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill(password);
    await page.getByRole("button", { name: /Se connecter/i }).click();
    await expect(page).toHaveURL(/\/tableau-de-bord/);

    // 3. Création d'un projet
    await page.goto("/projets");
    await page.getByRole("button", { name: /Créer un projet/i }).click();
    await page.getByLabel("Nom du projet").fill("Projet E2E Alpha");
    await page.getByRole("button", { name: /Créer le projet/i }).click();
    await expect(page).toHaveURL(/\/projets\/.+/);
    await expect(page.getByRole("heading", { name: "Projet E2E Alpha" })).toBeVisible();

    // 4. Création d'une tâche & changement de statut
    await page.getByRole("button", { name: /Nouvelle tâche/i }).click();
    await page.getByLabel("Titre").fill("Tester le flux Kanban complet");
    await page.getByRole("button", { name: /Créer la tâche/i }).click();
    await expect(page.getByText("Tester le flux Kanban complet")).toBeVisible();

    const patchPromise = page.waitForResponse(
      (res) => res.url().includes("/api/tasks/") && res.request().method() === "PATCH"
    );
    await page
      .getByRole("button", { name: /Déplacer vers En cours/i })
      .first()
      .click();
    const patchRes = await patchPromise;
    expect(patchRes.status()).toBe(200);
    await expect(page.getByText(/Statut mis à jour/i)).toBeVisible();
    await page.reload();
    const inProgressCol = page.locator('[data-kanban-column="IN_PROGRESS"]');
    await expect(inProgressCol.getByText("Tester le flux Kanban complet")).toBeVisible();

    // 5. Consultation du calendrier & ajout d'événement
    await page.goto("/calendrier");
    await expect(page.getByRole("heading", { name: "Calendrier" })).toBeVisible();
    await page.getByRole("button", { name: /Nouvel événement/i }).click();
    await page.getByLabel("Titre").fill("Point E2E Calendrier");
    await page.getByRole("button", { name: /Enregistrer/i }).click();
    await expect(page.getByText("Point E2E Calendrier").first()).toBeVisible();

    // 6. Invitation d'un membre & vérification permissions
    await page.goto("/equipe");
    await page.getByLabel("Adresse e-mail").fill(`invitee-${ts}@nexora.local`);
    await page.getByRole("button", { name: /Envoyer l'invitation/i }).click();
    await expect(page.getByText(`invitee-${ts}@nexora.local`)).toBeVisible();

    // 7. Tentative IDOR sur un projet inexistant / autre équipe
    const idorRes = await page.request.get("/api/projects/non-existent-idor-id-999");
    expect([403, 404]).toContain(idorRes.status());

    // 8. Déconnexion finale
    await page
      .getByRole("button", { name: /Déconnexion/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/connexion/);
  });
});
