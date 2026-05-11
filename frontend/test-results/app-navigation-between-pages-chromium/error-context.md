# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> navigation between pages
- Location: e2e/app.spec.ts:8:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/answers/
Received string:  "http://localhost:5173/laws"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    9 × unexpected value "http://localhost:5173/laws"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: "02"
      - generic [ref=e7]: /
      - generic [ref=e8]: Lois fiscales
    - generic [ref=e9]:
      - generic [ref=e11]: "Session: session_..."
      - button "Session" [ref=e12]:
        - img [ref=e13]
        - generic [ref=e16]: Session
      - button "Réponses" [active] [ref=e17]:
        - img [ref=e18]
        - generic [ref=e21]: Réponses
      - button "Lecture seule" [ref=e22]:
        - img [ref=e23]
        - generic [ref=e29]: Lecture seule
      - generic [ref=e32]: Hors ligne
      - button "Nouvelle session" [ref=e33]:
        - img [ref=e34]
        - generic [ref=e37]: Nouvelle session
  - generic [ref=e38]:
    - complementary [ref=e39]:
      - generic [ref=e41]:
        - generic [ref=e43]: CF
        - generic [ref=e44]:
          - paragraph [ref=e45]: Correcteur Fiscalité
          - paragraph [ref=e46]: Pro · v2
      - navigation [ref=e47]:
        - paragraph [ref=e48]: Étapes
        - link "Exercice 1" [ref=e49] [cursor=pointer]:
          - /url: /exercise
          - img [ref=e51]
          - generic [ref=e54]: Exercice
          - generic [ref=e55]: "1"
        - link "Lois fiscales 2" [ref=e56] [cursor=pointer]:
          - /url: /laws
          - img [ref=e59]
          - generic [ref=e62]: Lois fiscales
          - generic [ref=e63]: "2"
        - link "Réponses 3" [ref=e64] [cursor=pointer]:
          - /url: /answers
          - img [ref=e66]
          - generic [ref=e68]: Réponses
          - generic [ref=e69]: "3"
        - link "Vérification 4" [ref=e70] [cursor=pointer]:
          - /url: /verification
          - img [ref=e72]
          - generic [ref=e75]: Vérification
          - generic [ref=e76]: "4"
        - link "Final 5" [ref=e77] [cursor=pointer]:
          - /url: /final-check
          - img [ref=e79]
          - generic [ref=e83]: Final
          - generic [ref=e84]: "5"
      - paragraph [ref=e87]: Réponses basées uniquement sur le document de lois importé
    - main [ref=e88]:
      - generic [ref=e89]:
        - generic [ref=e90]:
          - generic [ref=e91]: Étape 2
          - heading "Lois fiscales" [level=1] [ref=e92]
          - paragraph [ref=e93]:
            - text: Importez le document de 243 pages. Il sera la
            - strong [ref=e94]: seule source
            - text: pour générer toutes les réponses — aucune loi inventée.
        - generic [ref=e96] [cursor=pointer]:
          - img [ref=e98]
          - generic [ref=e101]:
            - paragraph [ref=e102]: Glissez le document de lois ou cliquez pour importer
            - paragraph [ref=e103]: PDF · DOCX · DOC · TXT
        - generic [ref=e104]:
          - img [ref=e105]
          - paragraph [ref=e108]: Importez le document de lois fiscales pour commencer.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('homepage loads', async ({ page }) => {
  4  |   await page.goto('/');
  5  |   await expect(page).toHaveTitle(/Correcteur Fiscalité/);
  6  | });
  7  | 
  8  | test('navigation between pages', async ({ page }) => {
  9  |   await page.goto('/');
  10 |   
  11 |   // Navigate to Exercise page
  12 |   await page.click('text=Exercice');
  13 |   await expect(page).toHaveURL(/\/exercise/);
  14 |   
  15 |   // Navigate to Laws page
  16 |   await page.click('text=Lois');
  17 |   await expect(page).toHaveURL(/\/laws/);
  18 |   
  19 |   // Navigate to Answers page
  20 |   await page.click('text=Réponses');
> 21 |   await expect(page).toHaveURL(/\/answers/);
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  22 | });
  23 | 
```