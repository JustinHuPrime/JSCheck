# Milestone 1

We discussed several static analysis project ideas, including a borrow checker, a type checker, and annotations for mutability and nullness. We also discussed working on some visualizations of performance, control flow, and class and type hierarchies. After some debate, we ended up voting in favour of either a borrow checker, annotations for mutability and nullness, or a type checker. After discussion with our TA, we ended up deciding to create a type checker for JavaScript.

We have decided to do our analysis on the AST of our input functions, and report instances where JavaScript might raise either a ReferenceError or a TypeError.

We now need to generate a set of examples to run through our type checker, as well as example error messages.