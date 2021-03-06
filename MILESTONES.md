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

The user study was conducted using the following Google Doc: https://docs.google.com/forms/d/e/1FAIpQLSd9a9-Ww5l6otk25c84NgWoD0qr-KsAXp13L0KG6r9Ud8l7-w/viewform?usp=sf_link.

We showed our participants the buggy code snippets we wrote (found in the `/examples` folder), and showed them up to 4 different error messages in increasing verbosity. The initial message was always what JavaScript showed (although there was 1 case where JavaScript did not show an error, but some potentially unexpected behaviour was encountered), and the subsequent messages increased in verbosity, with some even including warnings.

Participants in the user study stated that the default JavaScript errors tended not to be helpful (except in the last snippet). They found our initial "Level 2" error messages the most helpful. These messages give a general description of the problem, the line that it is found on, and the types involved in the error. They also found the default JavaScript error in the last code snippet helpful. This message was:

```js
TypeError: Cannot read property 'concat' of undefined (13:11)
```

In the other code snippets, the default JavaScript error did not specify a type - once our "Level 2" error messages specified the types that caused the error, participants were able to find what/where the error was. This leads us to conclude that our error messages should include types, and that there is value in using our tool to detect type errors in JavaScript.

Participants also stated that they found the more-verbose error messages too confusing, that they may be providing too much information. These verbose errors commonly included warnings. Hence, we conclude that we should minimize the number of warnings that are shown to the user, or at least give them the option to suppress warnings. It is important to note that the code snippets in our user studies is somewhat contrived; therefore, users might find more value in these warnings for more complex cases with multiple code paths.

We will be having further discussions on the appropriate level of information given by our type checker at a later date.

# Milestone 4

So far, we've implemented type checking for the following:

- Literals: strings, numbers, arrays, objects
  - For arrays, we track their element type, which may be one type or multiple types within a `UnionType`
  - For objects, we track each property and the types they have in a mapping
- Binary / unary operations
- Variable references and assignment (only `=` so far)
- Reading/writing array indices and object properties
  - For arrays, we only support numeric indices and assume all array accesses are in range
  - For objects, we only support static and literal property names. e.g. `obj.name` and `obj['name']` are supported but not `obj['name' + someVar]`, as the latter means that the property name can change at runtime

Planned / Work in progress parts:
- If statements
  - In most cases, we will union types of variables that get (re)assigned inside an `if` statement
- For loops
- Compound assignments (e.g. `+=`)
- Field references/method on primitive types (e.g. `.slice()` on a number should raise an error)
  - For primitive types, we may hardcode a list of known functions, or read them off of some JavaScript API
- Type specialization (e.g. `if typeof(x) === ???string??? {...}`)

Tentatively, we plan to drop support for function calls and imports, instead limit our type checker's focus to simple self-contained scripts.

---------------------

Plans for final user study:

We plan to conduct the final user study using the same format (with Google Forms) and with similar buddy code snippets, preferably this time with functionality that we would want to highlight that our project implements.

In addition, this time, we would also want to only show error messages that we will be implementing (likely error messages with some sort of type information).

# Milestone 5

For our second user study, we had two participants who filled out a Google Doc with feedback on the default JS error messages and the error messages that
our tool will be showing.

Similar to our first user study, participants found that error messages with type information were more helpful than the standard JavaScript
error messages. Our participants also said that our tool's error messages were well-tuned, and contained just the right amount of information in most cases. This might
have been helped by us deciding not to include warnings in our error messages, which made the error messages too verbose according to participants in User Study 1.

Participants also found that our error messages were worded better than JavaScript's original error messages. For example, when we had an error on `undefined`, the original JS error message was `attempted to call concat on undefined`. 

Our error message was: `Attempted to call 'concat' on undefined`

Our participants said that our error message made it more obvious what the problem was, despite the similar phrasing of
both error messages.

However, one participant stated that it would be an improvement if we could include variable names in our messages, that is,
if an error occured on the variable `a`, the error message should include that information instead of hte line number.
We would like to implement this, but have decided to hold off on this for now due to a lack of engineering cycles.

For the remaining days, we plan to make our video. In this video, we plan to show common JavaScript errors 
and demonstrate how our type checker can help mitigate them.

As of now, we have three major tasks remaining:

- Type checking `for` expressions
- Compound assignment checking
- Type specialization (time permitting)