# Milestone 1

We discussed several static analysis project ideas, including a borrow checker, a type checker, and annotations for mutability and nullness. We also discussed working on some visualizations of performance, control flow, and class and type hierarchies. After some debate, we ended up voting in favour of either a borrow checker, annotations for mutability and nullness, or a type checker. After discussion with our TA, we ended up deciding to create a type checker for JavaScript.

We have decided to do our analysis on the AST of our input functions, and report instances where JavaScript might raise either a ReferenceError or a TypeError.

We now need to generate a set of examples to run through our type checker, as well as example error messages.

# Milestone 2

Our idea remains unchanged from the previous milestone. We take, as input, a list of JavaScript files, and as output, we produce a list of locations where the program may raise either a ReferenceError or a TypeError. As part of this, we need to know what type variables might have at what point in the execution, as well as being aware of the requirements of standard library functions.

We were informed that we ought to involve control flow sensitivity within the type checker - that is, the type checker should recognize that an `if` statement can be predicated on the type of an expression.

Our tasks have not yet been firmly assigned - we're going to more specifically assign tasks after some work on our project's skeleton code, which we plan to work on during this week.