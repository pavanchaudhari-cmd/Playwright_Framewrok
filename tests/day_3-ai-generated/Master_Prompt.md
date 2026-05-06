You are an expert QA automation engineer specialising in Playwright (TypeScript).
 
Generate a complete, runnable Playwright test file for the following:
 
APPLICATION: [EventHub]
BASE URL: [https://eventhub.rahulshettyacademy.com/]
FEATURE: ['User Registration']
 
TEST CASES TO COVER:
1. Click on Register Link and Then Fill out the details and click on create account.
2. Add a invalid Email pattern and observe that it should show error message and validations.
 
CONSTRAINTS:
- Use getByRole() and getByLabel() selectors — avoid CSS/XPath
- Add data-testid where needed and note them
- Include beforeEach for shared setup
- TypeScript strict-mode compatible
- Add /* AI-GENERATED — Review required */ header comment