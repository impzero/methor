import {
  bind,
  charP,
  digit,
  either,
  many,
  Parser,
  result,
  stringP,
  whitespace,
} from "https://raw.githubusercontent.com/fr3fou/djena/master/parse.ts";

interface Expression {
  expressionNode(): void;
}

class InfixExpression implements Expression {
  constructor(
    readonly operator: Operator,
    readonly lhs: Expression,
    readonly rhs: Expression
  ) {}

  expressionNode() {}
}

class FunctionInvocationExpression implements Expression {
  constructor(readonly name: Fn, readonly arg: Expression) {}
  expressionNode(): void {}
}

class Integer implements Expression {
  constructor(readonly value: number) {}
  expressionNode(): void {}
}

type Operator = "+" | "-" | "*" | "/";
type Fn = "sin" | "cos" | "abs";
const fns: { [key in Fn]: (n: number) => number } = {
  sin: Math.sin,
  cos: Math.cos,
  abs: Math.abs,
};

function integer(): Parser<Integer> {
  return bind(
    either(
      bind(charP("-"), (m) => bind(many(digit()), (d) => result([m, ...d]))),
      many(digit())
    ),
    (v) => result(new Integer(Number(v.join(""))))
  );
}

function fn(): Parser<FunctionInvocationExpression> {
  return bind(
    either(stringP("sin"), either(stringP("cos"), stringP("abs"))) as Parser<
      Fn
    >,
    (name) =>
      bind(whitespace(), (_) =>
        bind(charP("("), (_) =>
          bind(sum(), (exp) =>
            bind(charP(")"), (_) =>
              result(new FunctionInvocationExpression(name, exp))
            )
          )
        )
      )
  );
}

function terminal(): Parser<Expression> {
  return bind(whitespace(), (_) =>
    bind(
      either(
        bind(charP("("), (_) =>
          bind(sum(), (exp) => bind(charP(")"), (_) => result(exp)))
        ),
        either(fn(), integer())
      ),
      (term) => bind(whitespace(), (_) => result(term))
    )
  );
}

function product(): Parser<Expression> {
  return either(
    bind(terminal(), (lhs) =>
      bind(charP("*") as Parser<Operator>, (op) =>
        bind(product(), (rhs) => result(new InfixExpression(op, lhs, rhs)))
      )
    ),
    either(
      bind(terminal(), (lhs) =>
        bind(charP("/") as Parser<Operator>, (op) =>
          bind(product(), (rhs) => result(new InfixExpression(op, lhs, rhs)))
        )
      ),
      terminal()
    )
  );
}

function sum(): Parser<Expression> {
  return either(
    bind(product(), (lhs) =>
      bind(charP("+") as Parser<Operator>, (op) =>
        bind(sum(), (rhs) => result(new InfixExpression(op, lhs, rhs)))
      )
    ),
    either(
      bind(product(), (lhs) =>
        bind(charP("-") as Parser<Operator>, (op) =>
          bind(sum(), (rhs) => result(new InfixExpression(op, lhs, rhs)))
        )
      ),
      product()
    )
  );
}

export function expression(): Parser<Expression> {
  return bind(sum(), (exp) => bind(EOF(), (_) => result(exp)));
}

function EOF(): Parser<boolean> {
  return (input) => (input === "" ? [[true, input]] : []);
}

export function evalExp(e: Expression): number {
  if (e instanceof Integer) {
    return e.value;
  }

  if (e instanceof InfixExpression) {
    switch (e.operator) {
      case "+":
        return evalExp(e.lhs) + evalExp(e.rhs);
      case "-":
        return evalExp(e.lhs) - evalExp(e.rhs);
      case "/":
        return evalExp(e.lhs) / evalExp(e.rhs);
      case "*":
        return evalExp(e.lhs) * evalExp(e.rhs);
    }
  }

  if (e instanceof FunctionInvocationExpression) {
    return fns[e.name](evalExp(e.arg));
  }

  return 0;
}
