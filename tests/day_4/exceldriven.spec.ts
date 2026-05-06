import { test, expect } from '../../fixtures/auth_fixtures';
import { parseExcelTestCases } from '../../utils/excel-reader';
 
const cases = parseExcelTestCases('./test-data/test-cases.xlsx');
const uiCases = cases.filter(tc => tc.TestType === 'UI');
 
test.describe('Excel-Driven UI Tests', { tag: ['@ui', '@data-driven'] }, () => {
  for (const tc of uiCases) {
    test(`[${tc.TestID}] ${tc.TestName}`, async ({ page }) => {
      await page.goto(tc.InputData.url || '/');
      if (tc.InputData.username)
        await page.getByLabel('Username').fill(tc.InputData.username);
      if (tc.InputData.submitButton)
        await page.getByRole('button', { name: tc.InputData.submitButton }).click();
      if (tc.InputData.expectedUrl)
        await expect(page).toHaveURL(new RegExp(tc.InputData.expectedUrl));
      if (tc.InputData.expectedText)
        await expect(page.getByText(tc.InputData.expectedText)).toBeVisible();
    });
  }
});