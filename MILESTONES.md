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

# Milestone 3

So far, we've written up a handful of purposely buggy JavaScript code examples, which will crash when running on the command line with either a TypeError or ReferenceError. These have a non-trivial amount of control flow including `if` statements, `foreach` loops, and function calls, so we can use them as examples for both the user study and the actual implementation.

Our initial user study is scheduled for for Tuesday, Nov 9, 2021. There, we plan to present some buggy code to the user with error messages of varying verbosity, and have them try to pinpoint the bug without running the code manually.

Another possibility we discussed is raising warnings for arithmetic operations that are likely to give a meaningless result (e.g. `array * number`), as these could help the user identify bugs more easily. However, in the TA discussion, we learned that this is a difficult problem to solve generally, as variables may take on different types at runtime (e.g. external API calls or list indexing returning `undefined`). So, we may leave these as only a theoretical example for our user study.

We plan to start on our implementation over reading break. Tentatively we plan to handle basic control flow (`if/else`, `for` loops, function calls), and extend our analysis to external dependencies by reading through `node_modules` on a best effort basis.

TODO: user study results
