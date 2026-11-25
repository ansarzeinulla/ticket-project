import { API_BASE_URL, PASSWORD, api, expect, latestEmailedCode, signIn, test, uniqueEmail } from "./fixtures";

/**
 * SRS 4.1: registration, sign-in, sign-out, password reset and change.
 *
 * Fields are addressed by their `name` attribute rather than their label. The
 * shared FieldShell appends a required marker to every label, so the accessible
 * name of the password input is "Password *" — matching on the name attribute
 * says what is meant and does not break when that marker changes.
 */

test("a visitor registers, lands back on the storefront, and signs out", async ({ page }) => {
  const email = uniqueEmail("register");

  await page.goto("/register");
  await page.locator('input[name="full_name"]').fill("Dana Amirova");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator('input[name="confirm_password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();

  // BF-100: nobody is pushed into the organizer dashboard; the storefront is home.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("profile-link")).toHaveText("Dana Amirova");

  // Sign-out lives in the account menu (BF-100).
  await page.getByTestId("account-menu").click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByTestId("header-sign-in")).toBeVisible();
});

test("signing in with the wrong password says so without revealing anything", async ({
  page,
}) => {
  const account = await api.register("wrongpass");

  await page.goto("/login");
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill("not the right password");
  await page.getByRole("button", { name: "Sign in" }).click();

  // The message must not distinguish "no such account" from "wrong password",
  // or the form becomes a way to enumerate who is registered.
  await expect(page.getByRole("alert").first()).toContainText(/incorrect/i);
  await expect(page).toHaveURL(/\/login/);
});

test("the dashboard is not reachable without signing in", async ({ page }) => {
  await page.goto("/dashboard");

  // proxy.ts redirects before the page renders, and carries the destination so
  // signing in returns you where you were going.
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});

test("forgotten password answers identically whether or not the account exists", async ({
  page,
}) => {
  const known = await api.register("forgot");

  for (const email of [known.email, "definitely-not-registered@biletflow.test"]) {
    await page.goto("/forgot-password");
    await page.locator('input[name="email"]').fill(email);
    await page.getByRole("button", { name: /send|reset/i }).click();

    // Identical wording either way: SRS 4.1's reset must not enumerate users.
    await expect(page.getByRole("heading", { name: /check your inbox/i })).toBeVisible();
  }
});

test("an organizer changes their own password and the old one stops working", async ({
  page,
}) => {
  const account = await api.register("changepass");
  await signIn(page, account.token);

  await page.goto("/dashboard/profile");
  await page.locator('input[name="current_password"]').fill(PASSWORD);
  await page.locator('input[name="new_password"]').fill("an entirely different passphrase");
  await page.locator('input[name="confirm_password"]').fill("an entirely different passphrase");
  await page.getByTestId("change-password").click();

  await expect(page.getByRole("status").first()).toContainText(/changed/i);

  // Proven by using it, not by trusting the banner: SRS 4.1 is about the
  // credential actually changing, not about a message saying it did.
  const refused = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: account.email, password: PASSWORD }),
  });
  expect(refused.status).toBe(401);
});

test("an organizer fills in their profile and it survives a reload", async ({ page }) => {
  const account = await api.register("profile");
  await signIn(page, account.token);

  await page.goto("/dashboard/profile");
  await page.locator('input[name="display_name"]').fill("Dana Events");
  await page.locator('input[name="contact_email"]').fill("hello@danaevents.kz");
  await page.locator('input[name="website_url"]').fill("https://danaevents.kz");
  await page.getByTestId("save-profile").click();

  await expect(page.getByRole("status").first()).toContainText(/saved/i);

  await page.reload();
  await expect(page.locator('input[name="display_name"]')).toHaveValue("Dana Events");
  await expect(page.locator('input[name="contact_email"]')).toHaveValue(
    "hello@danaevents.kz",
  );
});

test("the profile refuses an address that is not one, on the field itself", async ({
  page,
}) => {
  const account = await api.register("profileinvalid");
  await signIn(page, account.token);

  await page.goto("/dashboard/profile");
  await page.locator('input[name="contact_email"]').fill("not-an-address");
  await page.getByTestId("save-profile").click();

  // The API's 422 field map is rendered on the input that caused it.
  const field = page.locator('input[name="contact_email"]');
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(/valid email address/i)).toBeVisible();
});

test("a forgotten password is reset with the emailed code without leaving the page", async ({ page }) => {
  const account = await api.register("codereset");

  await page.goto("/forgot-password");
  await page.locator('input[name="email"]').fill(account.email);
  await page.getByRole("button", { name: /send|reset/i }).click();
  await expect(page.getByRole("heading", { name: /check your inbox/i })).toBeVisible();

  // The code and the new password go in right here.
  const code = await latestEmailedCode(account.email, "account.password_reset");
  // Six boxes; typing the whole code into the first one spreads it across.
  await page.getByTestId("reset-code-0").fill(code);
  await page.locator('input[name="password"]').fill("a fresh passphrase 2026");
  await page.locator('input[name="confirmation"]').fill("a fresh passphrase 2026");
  await page.getByRole("button", { name: /change password/i }).click();
  await expect(page.getByRole("heading", { name: /password changed/i })).toBeVisible();

  // The new password signs in.
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill("a fresh passphrase 2026");
  await page.locator("form").getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("a new account confirms its email with the 6-digit code on the profile page", async ({ page }) => {
  const account = await api.register("codeverify", "E2E Tester", { verified: false });
  await signIn(page, account.token);
  await page.goto("/");

  // The banner is only a one-line pointer to the profile page.
  await expect(page.getByTestId("verify-email-banner")).toBeVisible();
  await page.getByTestId("verify-email-go").click();
  await expect(page).toHaveURL(/\/dashboard\/profile/);
  await expect(page.getByTestId("confirm-email-card")).toBeVisible();

  // A wrong code is refused with a message, and the boxes clear.
  const code = await latestEmailedCode(account.email, "account.email_verification");
  const wrong = code === "000000" ? "111111" : "000000";
  await page.getByTestId("verify-email-code-0").fill(wrong);
  await expect(page.getByTestId("verify-email-error")).toBeVisible();

  // A full code confirms by itself, without pressing anything.
  await page.getByTestId("verify-email-code-0").fill(code);
  await expect(page.getByTestId("confirm-email-done")).toBeVisible();
  await page.goto("/");
  await expect(page.getByTestId("verify-email-banner")).toHaveCount(0);
});

test("publishing waits for a confirmed email and says where to confirm it", async ({ page }) => {
  // SRS UC1: "Organizer has a verified account."
  const organizer = await api.register("unconfirmedpublisher", "E2E Tester", { verified: false });
  await api.createEvent(organizer.token, "Unconfirmed Showcase");
  await signIn(page, organizer.token);
  await page.goto("/dashboard");

  await page.getByRole("button", { name: /^publish$/i }).first().click();
  const notice = page.getByTestId("publish-needs-email");
  await expect(notice).toBeVisible();
  await notice.getByRole("link").click();
  await expect(page.getByTestId("confirm-email-card")).toBeVisible();
});
