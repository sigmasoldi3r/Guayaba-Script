{
	function L(of) {
    	return {...of, location: location()}
    }
}

Script
	= __ Guayabo
 	body:(_ e:(Query / Macro) {return e})*
    __
    { return L({ type: 'program', body }) }

Guayabo = p:Pragma _ "manoguayabo"
	{ return L({...p, value: "manoguayabo" }) }

Macro "Macro definition"
	= MACRO _ name:Name src:$(!END .)* END
    { return L({ type: 'macro', name, src: src.trim() }) }

Pragma
	= PRAGMA { return L({ type: 'pragma' }) }

Query "Query statement"
	= Value
    / Select
    / Insert
    / Call
    / Function
    / Row
    / Return

Expr
	= '(' __ e:Query __ ')' { return e }
    / Literal
    / FromExpr
    

ExprList
	= '()'
    / e:Expr t:(__ ',' __ x:Expr {return x})*
    { return [e, ...t] }

Value
	= kind:VALUE _ target:TypeName _ AS _ names:NameList
    { return L({
    	type: 'query', kind, target, names
    }) }
    
Select
	= kind:SELECT _ names:NameList _ FROM __ Expr
    { return L({
    	type: 'query', kind
    }) }

Insert
	= kind:INSERT __ expr:Expr __ INTO _ target:FromExpr
    { return L({
    	type: 'query', kind, expr, target
    }) }
    
Call
	= kind:CALL _ target:FromExpr _ WITH __ args:ExprList
    { return L({
    	type: 'query', kind,
        target, args
    }) }
    
Function
	= DECLARE _ kind:FUNCTION _ name:Name
    args:(_ WITH _ e:TypeList {return e})?
    rType:(_ RETURNS _ n:TypeName {return n})?
    _ THEN __ body:(Expr / '(' o:(_ q:Query {return q})* __')' {return o})
    { return L({
    	type: 'query',
        kind, args, rType, body, name
    }) }
    
Row
	= DECLARE _ kind:ROW _ name:TypeName _ WITH
    __ '(' __ types:(t:TypeList __ {return t})?  ')'
    { return L({
    	type: 'query',
        kind, name, types
    }) }

Return
	= kind:RETURN _ expr:Expr
    { return L({ type: 'query', kind, expr }) }

// Terminals
NameList
	= e:Name t:(__ ',' __ n:Name {return n})*
    { return [e, ...t] }

TypeList
	= e:TypeName t:(__ ',' __ n:TypeName {return n})*
    { return [e, ...t] }

TypeName
	= p:AT? name:Name
    generic:('{' t:TypeList '}' {return t})?
    { return L({
    	type: 'typename',
        name, generic, pointer: !!p
    }) }

FromExpr
    = seg:(
        n:(e:Name {return {e}})
        nn:(_ v:(FROM / IN) _ e:Name {return {e, v}})*
        {return [n, ...nn]}
    )
    { return L({
        type: 'from',
        segments: seg.map(({e, v}) => ({
            name: e,
            mode: v?.toLowerCase()
        }))
    }) }

Name
	= EscapedName
    / PlainName
    / DollarExpression

EscapedName
    = '`' value:$(!'`' .)* '`'
    { return L({ type: 'name', escaped: true, value }) }

PlainName
    = value:$([_A-Za-z][_A-Za-z0-9]*)
    { return L({ type: 'name', value }) }

DollarExpression
    = '$' pos:$([0-9]+)
    { return L({ type: 'dollar', value: Number(pos) }) }

Literal
	= StringLiteral
    / NumberLiteral

StringLiteral
	= '"' value:$(!'"' .)* '"'
    { return L({ type: 'literal', kind: 'string', value }) }

NumberLiteral
	= value:$([0-9]+ ('.' [0-9]+)?)
    { return L({ type: 'literal', kind: 'number', value }) }

// Tokens
PRAGMA = '#pragma'
MACRO = '#macro'
END = '#end'
VALUE = 'value'i
SELECT = 'select'i
FROM = 'from'i
IN = 'in'i
AS = 'as'i
INSERT = 'insert'i
INTO = 'into'i
CALL = 'call'i
WITH = 'with'i
THEN = 'then'i
DECLARE = 'declare'i
FUNCTION = 'function'i
ROW = 'row'i
RETURNS = 'returns'i
RETURN = 'return'i
AT = '@'

Comment "Comment"
	= '--' e:$((![\n\r] .)*) &[\n\r]+
    { return { type: 'comment', value: e.trim() } }

WS "White space" = [ \t\n\r]
__ = (Comment / WS)*
_ = (Comment / WS)+
