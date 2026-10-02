import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Acervo } from './acervo';

describe('Acervo', () => {
  let component: Acervo;
  let fixture: ComponentFixture<Acervo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Acervo],
    }).compileComponents();

    fixture = TestBed.createComponent(Acervo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
