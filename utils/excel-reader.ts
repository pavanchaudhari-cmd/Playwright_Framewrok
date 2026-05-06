import * as xlsx from 'xlsx';
import { z } from 'zod';
 
const TestCaseSchema = z.object({
  TestID:         z.string(),
  Module:         z.string(),
  TestName:       z.string(),
  Priority:       z.enum(['High', 'Medium', 'Low']).optional(),
  InputData:      z.string().transform(s => { try { return JSON.parse(s); } catch { return {}; } }),
  Steps:          z.string().transform(s => s.split('|').map(t => t.trim())),
  ExpectedResult: z.string(),
  TestType:       z.enum(['UI', 'API', 'DB', 'E2E']),
  Enabled:        z.union([z.boolean(), z.string()])
                    .transform(v => String(v).toUpperCase() === 'TRUE'),
});
export type TestCase = z.infer<typeof TestCaseSchema>;
 
export function parseExcelTestCases(filePath: string): TestCase[] {
  const wb = xlsx.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json(ws, { defval: '' })
    .map(row => TestCaseSchema.safeParse(row))
    .filter(r => r.success && r.data.Enabled)
    .map(r => (r as any).data);
}