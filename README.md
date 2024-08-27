# Readme.md

need a edge extension, which will display a list of all open tabs inside my browser, in a list on a page. the goal is to later, make this list interactive. i can move around the tab elements, and assign relationships to them like a flowchart

debemos de mezclarlo con el api de tabs en edge para poder crear grupos, mover facilemente sin tener que right click y context menu coom/cope todo el dia

el popup solo me va a mostrar un preview del active/current task flowchart

el page me muestra todos los flowchart de tabs

### code explanation:

I reorganized the tabs.js file to group related functions together, making the code more readable and easier to navigate. Here's a summary of the changes:
Initial Setup: Grouped the initial setup functions (loadFlowchartState, displayCurrentState, loadArrowRelationships) at the top. 2. Chrome Tabs Query and Grouping: Kept the logic for querying Chrome tabs and grouping them by windowId together.
Save and Load Tab Order: Grouped the saveTabOrder and loadTabOrder functions together.
Flowchart State Management: Grouped the saveFlowchartState and loadFlowchartState functions together.
Drag and Drop within Flowchart Area: Grouped the event listeners and logic for drag and drop within the flowchart area. 6. Tool Selector Functionality: Grouped the tool selector logic and event listeners together.
State Management Buttons: Grouped the event listeners and functions for state management buttons (saveState, loadState, clearBoard, displayCurrentState).
Flowchart Element Creation: Grouped the createFlowchartElement and measureTextWidth functions together. 9. Save Current State: Placed the saveCurrentState function and its event listener together. 10. Arrow Relationships: Grouped the functions related to arrow relationships (createArrow, saveArrowRelationship, loadArrowRelationships) together.
This reorganization ensures that related functionalities are placed side by side, making the code more modular and easier to understand
