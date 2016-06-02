import _ from "lodash";
import moment from "moment";


class DalmatinerQueryCondition {
  constructor (op, ...args) {
    this.op = op;
    this.args = args;
  }

  and (other) {
    return new DalmatinerQueryCondition('and', this, other);
  }

  or (other) {
    return new DalmatinerQueryCondition('or', this, other);
  }

  toString() {
    var ns, key, value, a, b;
    switch (this.op) {
    case ('eq'):
      [[ns, key], value] = this.args;
      return ns ? `${ns}:'${key}' = '${value}'` :
        `'${key}' = '${value}'`;
    case ('and'):
      [a, b] = this.args;
      return `${a} AND ${b}`;
    case ('or'):
      [a, b] = this.args;
      return `${a} OR ${b}`;
    }
    return '';
  }
}


class DalmatinerQueryFun {
  constructor(fun, vars, args) {
    this.fun = fun;
    this.vars = vars;
    this.args = args;
  }

  toString() {
    var astr = this.args.join(function() {
      // TODO: implement me
    });
    return `${this.fun}()`;
  }
}

export class DalmatinerQuery {

  constructor() {
    this.variables = {};
    this.selects = [];
  }

  static equals(a, b) {
    return new DalmatinerQueryCondition('eq', a, b);
  }

  /**
   * Chain-able setters
   */
  from(c) {
    this.collection = c.value ? c.value : c.toString();
    return this;
  }
  
  select(m) {
    var selector = {toString: this._encodeSelector.bind(this)};
    this.active = this.selects.push(selector) - 1;
    this.metric = _.map(m, function (mpart) {
      return mpart.value ? mpart.value : mpart.toString();
    });
    return this;
  }

  beginningAt(t) {
    this.beginning = moment(t);
    return this;
  }

  endingAt(t) {
    this.ending = moment(t);
    return this;
  }

  with(name, value) {
    this.variables[name] = value;
    return this;
  }

  where(condition) {
    if (! condition instanceof DalmatinerQueryCondition) {
      throw new Error("Invalid query condition");
    }
    this.condition = condition;
    return this;
  }

  apply(fun, args = []) {
    var selector = this.selector[this.active],
        fargs = [selector].concat(args),
        f = new DalmatinerQueryFun(fun, this.variables, args);

    this.selector[this.active] = f;
    return this;
  }

  /**
   * Reading function
   */

  toString() {
    return this.toUserString() + ' ' + this._encodeRange();
  }
  
  toUserString() {
    return 'SELECT ' + this.selects.join(', ');
  }

  /**
   * Internal methods
   */

  _encodeSelector() {
    var metric = this._encodeMetric(),
        collection = this._encodeCollection(),
        str = `${metric} IN ${collection}`;
    if (this.condition) {
      str += ` WHERE ${this.condition}`;
    }
    return str;
  }

  _encodeCollection() {
    return `'${this.collection}'`;
  }

  _encodeMetric() {
    return _.map(this.metric, function(part) {
      return `'${part}'`;
    }).join('.');
  }

  _encodeRange() {
    var ending = this.ending.utc().format("YYYY-MM-DD HH:mm:ss"),
        duration = Math.round((this.ending - this.beginning) / 1000);
    return `BEFORE "${ending}" FOR ${duration}s`;
  }
};
