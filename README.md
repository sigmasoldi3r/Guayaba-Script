# Guava Script

![Guava Script logo](guayaba.png)

Program like if you're doing a query - but not.

## Example

```sql
#pragma manoguayabo
-- Imports
OPEN "stdio.h"

-- Macro definition
#macro square_sums
(...args) => args.map(value => `${value} * ${value}`).join(' + ')
#end

-- Example of global variable
VALUE int AS test_macro

-- Example of simple function
DECLARE FUNCTION test WITH int, int RETURNS int
THEN (
  RETURN (CALL sum WITH $1, $2)
)

-- Declaration of tuple types
DECLARE ROW test_row WITH (int, float, int)

-- Tuple type, static variable
VALUE test_row AS test_row_value

-- Initializer function example
-- Here @ denotes a pointer type.
DECLARE FUNCTION init_test_row WITH @test_row
THEN (
  INSERT 0 INTO _0 IN $1
  INSERT 1.0 INTO _1 IN $1
  INSERT 100 INTO _2 IN $1
)

-- Program entry point function
DECLARE FUNCTION main RETURNS int
THEN (
  INSERT (
    CALL square_sums WITH 1, 2, 3
  ) INTO test_macro

  CALL init_test_row WITH (
    CALL point WITH test_row_value
  )
  CALL print WITH
    "test_row = (%i, %f, %i)\n",
    _0 FROM test_row_value,
    _1 FROM test_row_value,
    _2 FROM test_row_value

  CALL print WITH "Hello World!\n"
  VALUE int AS i
  INSERT 0 INTO i
  CALL print WITH "i = %i\n", i
  INSERT (CALL sum WITH i, 1) INTO i
  CALL print WITH "after adding 1, i = %i\n", i
  CALL print WITH "test(1, 2) = %i\n", (CALL test WITH 1, 2)
  RETURN 0
)
```

## Basics

Function invocation is done via `CALL {name} WITH {arguments...}`.

If you happen to invoke a macro, it will be replaced by the expanded result of
the macro, at compile time. You can see this in the arithmetic functions of
`sum`, `sub`, `div`, `mul` which are all variadic, for example:

```sql
-- Example of macro expansion
VALUE int AS x
INSERT (CALL sum WITH 1, 2, 3, 4, 5) INTO x
```

This roughly expands to `x = 1 + 2 + 3 + 4 + 5`.

Structure access is done via `FROM`, if value, or `IN` if pointer, example:

```sql
-- Here we have a pointer value
VALUE @my_struct AS ptr
CALL print WITH "ptr->x = %i\n", x IN ptr

-- Here we have a structure value
VALUE my_struct AS val
CALL print WITH "val.x = %i\n", x FROM val
```

Pointer types are denoted by a `@` at the start of the name, for example:

```sql
-- This is like int* in C/C++
VALUE @int AS ptr
```
