import {IInputs, IOutputs} from "./generated/ManifestTypes";
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
type DataSet = ComponentFramework.WebApi.Entity;

export class ProjectProductsManager implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private _context: ComponentFramework.Context<IInputs>;
    private _container: HTMLDivElement;
    private _leftPanel: HTMLDivElement;
    private _rightPanel: HTMLDivElement;
    private _versionElement: HTMLDivElement;

    // Estado 
    private _selectedProductId: string | null = null;
    private _selectedProductEstimatedQty: number = 0;
    private _currentLines: any[] = [];
    private _productCounts: Record<string, number> = {};
    private _lastDatasetIds: string = "";
    
    private readonly VERSION = "v0.0.6";

    // =======================================================================
    // NOMBRES LÓGICOS
    // =======================================================================
    private readonly LOGICAL_NAME_NOMBRE_PADRE = "sec_nombre"; 
    // Utiliza el alias del link-entity para leer campos de tablas relacionadas
    private readonly LOGICAL_NAME_NUMERO_PRODUCTO = "a_268d74c4a6744c079367357c0ab2686a.productnumber"; 
    private readonly LOGICAL_NAME_CANTIDAD_ESTIMADA = "sec_cantidadestimada"; 
    
    private readonly LOGICAL_NAME_LINEA_ENTIDAD = "sec_lineadeproductodeproyecto"; 
    private readonly LOGICAL_NAME_NOMBRE_HIJO = "sec_name"; 
    private readonly LOGICAL_NAME_NUMERO_SERIE = "sec_numerodeserie";
    
    private readonly LOGICAL_NAME_LOOKUP_PRODUCTO = "sec_productodeproyectoid"; 
    private readonly LOGICAL_NAME_ENTIDAD_PADRE_PLURAL = "sec_productodeproyectos"; 
    // =======================================================================

    constructor() {}

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        this._context = context;
        this._container = container;

        this._container.className = "pcf-main-container";

        this._leftPanel = document.createElement("div");
        this._leftPanel.className = "pcf-left-panel";

        this._rightPanel = document.createElement("div");
        this._rightPanel.className = "pcf-right-panel";
        
        this._versionElement = document.createElement("div");
        this._versionElement.className = "pcf-version";
        this._versionElement.innerText = this.VERSION;

        this._container.appendChild(this._leftPanel);
        this._container.appendChild(this._rightPanel);
        this._container.appendChild(this._versionElement);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._context = context;
        const dataset = context.parameters.projectProductsDataset;

        if (dataset.loading) return;

        const currentIds = dataset.sortedRecordIds.join(",");
        
        // Solo lanzamos la consulta agregada si la lista de IDs mostrada ha cambiado
        if (currentIds !== this._lastDatasetIds && dataset.sortedRecordIds.length > 0) {
            this._lastDatasetIds = currentIds;
            this.fetchCounts(dataset);
        } else {
            this.renderLeftPanel(dataset);
        }
    }

    private fetchCounts(dataset: ComponentFramework.PropertyTypes.DataSet): void {
        const ids = dataset.sortedRecordIds;
        const valuesXml = ids.map(id => `<value>${id}</value>`).join('');
        
        const fetchXml = `
        <fetch aggregate="true">
          <entity name="${this.LOGICAL_NAME_LINEA_ENTIDAD}">
            <attribute name="${this.LOGICAL_NAME_LOOKUP_PRODUCTO}" alias="productid" groupby="true" />
            <attribute name="${this.LOGICAL_NAME_LINEA_ENTIDAD}id" alias="count" aggregate="count" />
            <filter type="and">
              <condition attribute="${this.LOGICAL_NAME_LOOKUP_PRODUCTO}" operator="in">
                ${valuesXml}
              </condition>
              <condition attribute="statecode" operator="eq" value="0" />
            </filter>
          </entity>
        </fetch>`;

        this._context.webAPI.retrieveMultipleRecords(this.LOGICAL_NAME_LINEA_ENTIDAD, "?fetchXml=" + encodeURIComponent(fetchXml))
            .then(response => {
                const newCounts: Record<string, number> = {};
                ids.forEach(id => newCounts[id] = 0); 

                response.entities.forEach(entity => {
                    const productId = entity["productid"] || entity[`_${this.LOGICAL_NAME_LOOKUP_PRODUCTO}_value`];
                    const count = entity["count"];
                    if (productId && count !== undefined) {
                        newCounts[productId] = parseInt(count, 10);
                    }
                });

                this._productCounts = newCounts;
                this.renderLeftPanel(dataset);
            })
            .catch(err => {
                console.error("Error al obtener conteos agregados", err);
                this.renderLeftPanel(dataset);
            });
    }

    private renderLeftPanel(dataset: ComponentFramework.PropertyTypes.DataSet): void {
        this._leftPanel.innerHTML = ""; 

        const title = document.createElement("h3");
        title.innerText = "Productos de Proyecto";
        this._leftPanel.appendChild(title);

        dataset.sortedRecordIds.forEach(recordId => {
            const record = dataset.records[recordId];

            const nombre = record.getFormattedValue(this.LOGICAL_NAME_NOMBRE_PADRE) || "Sin nombre";
            const numeroProducto = record.getFormattedValue(this.LOGICAL_NAME_NUMERO_PRODUCTO) || "--";
            const cantidadEstimadaStr = record.getValue(this.LOGICAL_NAME_CANTIDAD_ESTIMADA);
            const cantidadEstimada = cantidadEstimadaStr ? parseInt(cantidadEstimadaStr as string, 10) : 0;
            const cantidadCreada = this._productCounts[recordId] !== undefined ? this._productCounts[recordId] : 0;

            const card = document.createElement("div");
            card.className = "pcf-card";
            
            if (cantidadCreada < cantidadEstimada) {
                card.classList.add("count-low");
            } else if (cantidadCreada === cantidadEstimada) {
                card.classList.add("count-exact");
            } else {
                card.classList.add("count-high");
            }

            if (this._selectedProductId === recordId) {
                card.classList.add("selected");
            }

            const cardHeader = document.createElement("div");
            cardHeader.className = "pcf-card-header";
            
            const cardTitle = document.createElement("span");
            cardTitle.className = "pcf-card-title";
            cardTitle.innerText = nombre;

            const cardNum = document.createElement("span");
            cardNum.className = "pcf-card-num";
            cardNum.innerText = `#${numeroProducto}`;

            cardHeader.appendChild(cardTitle);
            cardHeader.appendChild(cardNum);

            const cardQty = document.createElement("div");
            cardQty.className = "pcf-card-qty";
            cardQty.innerText = `Líneas: ${cantidadCreada} / Estimadas: ${cantidadEstimada}`;

            card.appendChild(cardHeader);
            card.appendChild(cardQty);

            card.onclick = () => {
                this._selectedProductId = recordId;
                this._selectedProductEstimatedQty = cantidadEstimada;
                this.renderLeftPanel(dataset); 
                this.loadRightPanel();
            };

            this._leftPanel.appendChild(card);
        });
    }

    private loadRightPanel(): void {
        this._rightPanel.innerHTML = "Cargando líneas...";

        if (!this._selectedProductId) {
            this._rightPanel.innerHTML = "Seleccione un producto para ver sus líneas.";
            return;
        }

        const query = `?$filter=_${this.LOGICAL_NAME_LOOKUP_PRODUCTO}_value eq ${this._selectedProductId} and statecode eq 0`;

        this._context.webAPI.retrieveMultipleRecords(this.LOGICAL_NAME_LINEA_ENTIDAD, query).then(
            (response) => {
                this._currentLines = response.entities;
                this.renderRightPanel();
            },
            (error) => {
                console.error("Error al recuperar líneas", error);
                this._rightPanel.innerHTML = "Error al cargar las líneas.";
            }
        );
    }

    private renderRightPanel(): void {
        this._rightPanel.innerHTML = "";

        const title = document.createElement("h3");
        title.innerText = "Líneas de Producto Asociadas";
        this._rightPanel.appendChild(title);

        const count = this._currentLines.length;
        const missing = this._selectedProductEstimatedQty - count;

        const controlsDiv = document.createElement("div");
        controlsDiv.className = "pcf-right-controls";

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.className = "pcf-name-input";
        nameInput.placeholder = "Nombre base (ej. Cámara)";
        
        controlsDiv.appendChild(nameInput);

        if (missing > 0) {
            const btnCreate = document.createElement("button");
            btnCreate.className = "pcf-btn-create";
            btnCreate.innerText = `Crear faltantes (${missing})`;
            btnCreate.onclick = () => this.createMissingLines(nameInput.value, missing);
            controlsDiv.appendChild(btnCreate);
        }

        this._rightPanel.appendChild(controlsDiv);

        const list = document.createElement("ul");
        list.className = "pcf-lines-list";

        this._currentLines.forEach(linea => {
            const li = document.createElement("li");
            li.className = "pcf-line-item";

            const nameSpan = document.createElement("span");
            nameSpan.className = "pcf-line-name";
            nameSpan.innerText = linea[this.LOGICAL_NAME_NOMBRE_HIJO] || "Sin nombre";

            const serialInput = document.createElement("input");
            serialInput.type = "text";
            serialInput.className = "pcf-serial-input";
            serialInput.placeholder = "Nº Serie";
            serialInput.value = linea[this.LOGICAL_NAME_NUMERO_SERIE] || "";
            
            serialInput.onblur = () => {
                const newVal = serialInput.value.trim();
                const oldVal = linea[this.LOGICAL_NAME_NUMERO_SERIE] || "";
                if (newVal !== oldVal) {
                    serialInput.classList.add("saving");
                    const data = { [this.LOGICAL_NAME_NUMERO_SERIE]: newVal };
                    this._context.webAPI.updateRecord(this.LOGICAL_NAME_LINEA_ENTIDAD, linea[this.LOGICAL_NAME_LINEA_ENTIDAD + "id"], data)
                        .then(() => {
                            serialInput.classList.remove("saving");
                            serialInput.classList.add("saved");
                            linea[this.LOGICAL_NAME_NUMERO_SERIE] = newVal; 
                            setTimeout(() => serialInput.classList.remove("saved"), 1500);
                        })
                        .catch(e => {
                            serialInput.classList.remove("saving");
                            serialInput.classList.add("error");
                            console.error("Error actualizando Nº serie", e);
                        });
                }
            };

            li.appendChild(nameSpan);
            li.appendChild(serialInput);
            list.appendChild(li);
        });

        this._rightPanel.appendChild(list);
    }

    private createMissingLines(baseText: string, missingCount: number): void {
        if (!this._selectedProductId || missingCount <= 0) return;

        let baseName = baseText.trim() || "Nueva línea";
        let prefix = baseName;
        let startNum = 1;

        const match = baseName.match(/^(.*?)(\s*\d+)$/);
        if (match) {
            prefix = match[1].trim();
            startNum = parseInt(match[2].trim(), 10);
        }

        let maxNum = startNum - 1;
        const existingNames = this._currentLines.map(l => l[this.LOGICAL_NAME_NOMBRE_HIJO] || "");
        
        existingNames.forEach(n => {
            if (n === prefix) {
                maxNum = Math.max(maxNum, 1);
            } else if (n.startsWith(prefix + " ")) {
                const numPart = n.substring(prefix.length + 1);
                const parsed = parseInt(numPart, 10);
                if (!isNaN(parsed)) {
                    maxNum = Math.max(maxNum, parsed);
                }
            }
        });

        let currentNum = maxNum + 1;
        const promises = [];

        for (let i = 0; i < missingCount; i++) {
            const data: any = {};
            data[`${this.LOGICAL_NAME_LOOKUP_PRODUCTO}@odata.bind`] = `/${this.LOGICAL_NAME_ENTIDAD_PADRE_PLURAL}(${this._selectedProductId})`;

            let finalName = prefix;
            if (currentNum > 1 || baseName.match(/\d+$/)) {
                 finalName = `${prefix} ${currentNum}`;
            }

            data[this.LOGICAL_NAME_NOMBRE_HIJO] = finalName;
            promises.push(this._context.webAPI.createRecord(this.LOGICAL_NAME_LINEA_ENTIDAD, data));
            currentNum++;
        }

        Promise.all(promises).then(() => {
            this.loadRightPanel();
            
            const dataset = this._context.parameters.projectProductsDataset;
            this.fetchCounts(dataset); 
            
        }).catch(error => {
            console.error("Error al crear líneas faltantes", error);
            alert("Error al crear líneas. Revisa la consola.");
        });
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
    }
}