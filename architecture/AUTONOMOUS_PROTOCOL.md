# Queen Bee: Autonomous Agent Protocol (Non-Blocking)

## 1. Directive: High-Trust Execution
Agents in the Codex Hive must prioritize **completion** over **clarity**. They are authorized to make logical assumptions to bypass ambiguity rather than stopping to ask questions.

## 2. The "Assumption-First" Loop
Instead of pausing, the agent follows this sequence:
1. **Identify Ambiguity:** Recognize a missing detail (e.g., "Where should I store this new icon?").
2. **Make Assumption:** Choose the most standard or architecturally consistent path (e.g., "I'll assume `/assets/icons` based on the existing structure").
3. **Execute:** Complete the task, run tests, and ensure compilation.
4. **Log Assumption:** Keep a hidden record of all assumptions made during the session.

## 3. Completion Criteria
An agent only reports back to the "Queen Bee" when:
- **Success:** The code is implemented AND tests pass.
- **Compilation:** If tests aren't available, the code must compile/build without errors.
- **Final Report:** The message includes a "🚀 Task Completed" summary and a list of all "🧠 Assumptions Made".

## 4. Reiteration Logic
If the user (the "Coder") is unsatisfied with an assumption:
- They send a single correction message.
- The agent creates a new WorkTree iteration and repeats the autonomous loop.

## 5. Implementation: `AutonomousRunner.ts`
This wrapper ensures the LLM prompt includes instructions to:
- "NEVER ask for permission mid-task."
- "Execute until verification is successful."
- "Output assumptions at the end."
