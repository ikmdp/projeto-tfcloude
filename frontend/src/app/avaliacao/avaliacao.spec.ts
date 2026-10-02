import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Avaliacao } from './avaliacao';

describe('Avaliacao', () => {
  let component: Avaliacao;
  let fixture: ComponentFixture<Avaliacao>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Avaliacao],
    }).compileComponents();

    fixture = TestBed.createComponent(Avaliacao);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
