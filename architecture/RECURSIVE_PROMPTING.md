# The Queen Bee: Recursive Context Discovery & Prompt Synthesis

## Core Logic: The "Observation-First" Loop
When the Queen Bee receives a complex command (e.g., "Fix the UI in Project A and add video features to Project B"), she does NOT immediately launch agents. She follows this recursive protocol:

### Phase 1: Silent Reconnaissance (The "Peek")
For each project mentioned:
1. **Tree Scan:** Executes `ls -R` and reads `README.md` / `package.json` to understand the stack.
2. **Context Mapping:** Identifies the specific files relevant to the request (e.g., searches for "CloseButton" or "video-player").
3. **Execution Check:** If possible, runs a build or test command to see if the current state is broken.

### Phase 2: Knowledge Synthesis
The Queen Bee combines three sources of information:
- **User Intent:** The raw prompt from the Global Command Bar.
- **Project DNA:** What she discovered during the Peek (file structure, tech stack, constraints).
- **Agent Best Practices:** Her internal logic for the specific task (UI design vs. Video processing).

### Phase 3: Recursive Prompt Engineering
She drafts a "Super-Prompt" for the sub-agent that is significantly more detailed than the user's original request.
- *Example Transformation:*
  - *User:* "Change the close button."
  - *Queen Bee:* "Project uses Tailwind + Framer Motion. Located in `src/components/Modal.tsx`. Requirement: Change the close button from a cross to a 'Minimalist X', ensuring the hover animation remains consistent with the project's design system found in `theme.ts`."

### Phase 4: The "Pre-Flight" Report
The Queen Bee presents her findings in the UI:
- "I've analyzed Project A. Found the button at line 42. I've engineered a prompt that includes your design system constraints. Ready to launch?"
