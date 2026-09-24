/**
 * Compile-time contract: what the server says it sends (generated from openapi.yaml)
 * must fit the types the screens are written against. If the backend changes a
 * response in a way the app can't take, `tsc` fails here, not on a phone.
 * Nothing in this file runs.
 */
import type { Booking, Review } from '@/features/booking';
import type { Content } from '@/features/education';
import type { Look, LookComment } from '@/features/looks';
import type { CarePlan, Collection } from '@/features/planner';
import type { User } from '@/features/profile';
import type { Product, ShelfItem } from '@/features/shelf';
import type { MenuItem, PortfolioPhoto, StylistProfile } from '@/features/stylist';
import type { ApiSchemas as S } from './index';

type Fits<Server, App> = [Server] extends [App] ? true : false;
const ok = <T extends true>() => undefined as unknown as T;

export const contract = [
  ok<Fits<S['Look'], Look>>(),
  ok<Fits<S['Comment'], LookComment>>(),
  ok<Fits<S['Booking'], Booking>>(),
  ok<Fits<S['Review'], Review>>(),
  ok<Fits<S['UserResponse'], User>>(),
  ok<Fits<S['StylistProfile'], StylistProfile>>(),
  ok<Fits<S['MenuItem'], MenuItem>>(),
  ok<Fits<S['PortfolioPhoto'], PortfolioPhoto>>(),
  ok<Fits<S['CollectionResponse'], Collection>>(),
  ok<Fits<S['CarePlanResponse'], CarePlan>>(),
  ok<Fits<S['ProductResponse'], Product>>(),
  ok<Fits<S['ShelfItemResponse'], ShelfItem>>(),
  ok<Fits<S['ContentResponse'], Content>>(),
];
