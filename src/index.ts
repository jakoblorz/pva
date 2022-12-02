import type {
  ClassProp,
  ClassValue,
  OmitUndefined,
  StringToBoolean,
} from "./types";
import createDeepMergeAll from "@fastify/deepmerge";

export type VariantProps<Component extends (...args: any) => any> = Omit<
  OmitUndefined<Parameters<Component>[0]>,
  "class" | "className"
>;

const falsyToString = <T extends unknown>(value: T) =>
  typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;

/* cx
  ============================================ */

export type CxOptions = ClassValue[];
export type CxReturn = string;

const CxProps = [
  ...(["class", "className"] satisfies Array<keyof ClassProp>),
] as const;

export const cx = <T extends CxOptions>(...classes: T): CxReturn =>
  // @ts-ignore
  classes.flat(Infinity).filter(Boolean).join(" ");

/* cva
  ============================================ */

type ClassConfigSchema = Record<string, Record<string, ClassValue>>;
type PropConfigSchema<T> = Record<string, Record<string, T>>;

type ConfigSchema<T> = T extends Record<string, Record<string, infer U>>
  ? U extends ClassValue
    ? ClassConfigSchema
    : PropConfigSchema<U>
  : never;

type ConfigVariants<T extends ClassConfigSchema> = {
  [Variant in keyof T]?: StringToBoolean<keyof T[Variant]> | null;
};

type Config<T extends Record<string, Record<string, any>>> =
  T extends ConfigSchema<T>
    ? {
        variants?: T;
        defaultVariants?: ConfigVariants<T>;
        compoundVariants?: (T extends ClassConfigSchema
          ? ConfigVariants<T> & ClassProp
          : ClassProp)[];
      }
    : never;

type Props<T> = T extends ClassConfigSchema
  ? ConfigVariants<T> & ClassProp
  : ClassProp;

export const cva =
  <T extends ClassConfigSchema>(base?: ClassValue, config?: Config<T>) =>
  (props?: Props<T>) => {
    if (config?.variants == null)
      return cx(base, props?.class, props?.className);

    const { variants, defaultVariants } = config;

    const getVariantClassNames = Object.keys(variants).map(
      (variant: keyof typeof variants) => {
        const variantProp = props?.[variant as keyof typeof props];
        const defaultVariantProp = defaultVariants?.[variant];

        if (variantProp === null) return null;

        const variantKey = (falsyToString(variantProp) ||
          falsyToString(
            defaultVariantProp
          )) as keyof typeof variants[typeof variant];

        return variants[variant][variantKey];
      }
    );

    const propsWithoutUndefined =
      props &&
      Object.entries(props).reduce((acc, [key, value]) => {
        if (value === undefined) {
          return acc;
        }

        acc[key] = value;
        return acc;
      }, {} as Record<string, unknown>);

    const getCompoundVariantClassNames = config?.compoundVariants?.reduce(
      (
        acc,
        { class: cvClass, className: cvClassName, ...compoundVariantOptions }
      ) =>
        Object.entries(compoundVariantOptions).every(
          ([key, value]) =>
            ({
              ...defaultVariants,
              ...propsWithoutUndefined,
            }[key] === value)
        )
          ? [...acc, cvClass, cvClassName]
          : acc,
      [] as ClassValue[]
    );

    return cx(
      base,
      getVariantClassNames,
      getCompoundVariantClassNames,
      props?.class,
      props?.className
    );
  };

/* px
  ============================================ */

export const px = createDeepMergeAll({
  mergeArray(options) {
    return (source, target) => {
      return [...source, ...target].flat(Infinity).filter(Boolean);
    };
  },
});

/* pva
  ============================================ */

export const pva = <P extends ClassProp>(
  base?: Props<PropConfigSchema<P>>,
  config?: Config<PropConfigSchema<P>>
) => ({
  props: (props?: Props<PropConfigSchema<P>>) => {
    if (config?.variants == null) return px(base, props);
  },
  prop: (prop: keyof P, value: P[keyof P]) => {},
});
