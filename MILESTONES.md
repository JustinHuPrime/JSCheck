# Milestone 1

We discussed several static analysis project ideas, including a borrow checker, a type checker, and annotations for mutability and nullness. We also discussed working on some visualizations of performance, control flow, and class and type hierarchies. After some debate, we ended up voting in favour of either a borrow checker, annotations for mutability and nullness, or a type checker. After discussion with our TA, we ended up deciding to create a type checker for JavaScript.

We have decided to do our analysis on the AST of our input functions, and report instances where JavaScript might raise either a ReferenceError or a TypeError.

We now need to generate a set of examples to run through our type checker, as well as example error messages.

# Milestone 2

We are continuing on with our idea from Milestone 1 - a static analysis-based type checker for JavaScript. Our rough program outline is to take as input a list of JavaScript files, and produce as output a list of locations where the program may raise either a JavaScript ReferenceError or a TypeError. As part of this, we need to know what type variables might have at what point in the execution, as well as being aware of the requirements of standard library functions.

As part of the TA discussion, we were informed that we ought to involve control flow sensitivity within the type checker - that is, the type checker should recognize that an `if` statement can be predicated on the type of an expression.

Tentatively, our task assignments are as follows:
- **@JustinHuPrime** and **@wyndro** will work on the project skeleton - mostly, reading inputs and setting up the visitor template. (This is mostly done as of the end of this week)
- **@JustinHuPrime**, **@wyndro**, and **@jlu5** will work on the core analysis code, including the necessary AST visitor(s).
- **@kilowatt-** and **@curtiskoo** will lead the user studies.

We expect that this project may be harder to compartmentalize than Project 1, so we may change these assignments as we come up with more specific code tasks later on.
