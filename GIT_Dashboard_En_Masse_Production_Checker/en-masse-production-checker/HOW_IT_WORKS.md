# How It Works

The dashboard uses synthetic current-week and prior-week schedules plus synthetic production history. It calculates whether the latest production quantity likely covers the scheduled cases, flags partial or missing history, and lets the user make a case-only update decision.

## Decision logic

- If recent production quantity is equal to or greater than scheduled cases, the row is shown as likely covered.
- If recent production exists but is less than scheduled cases, the row is flagged as partial.
- If no useful production history exists, the row is flagged for review.
- If the user marks a row finished, the demo export writes zero cases.
- If the user edits the case value, the demo export writes the edited value.
- If the row is unchanged, the demo export does not include it.

## Why the demo matters

In a real manufacturing setting, this type of workflow reduces duplicate production, prevents manual case-entry errors, and gives planners a controlled way to decide what should be updated in the schedule.
