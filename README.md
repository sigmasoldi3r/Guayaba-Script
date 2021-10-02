# Guayaba Script

Program like if you're doing a query - but not.

## Example

```sql
#pragma manoguayabo

-- Macro definition
#macro square_sums
(...args) => args.map(({ value }) => `${value} * ${value}`).join(' + ')
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
  INSERT 0 INTO _0 FROM $1
  INSERT 1.0 INTO _1 FROM $1
  INSERT 100 INTO _2 FROM $1
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
